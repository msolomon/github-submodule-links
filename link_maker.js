
function log(message) {
	//console.log(message);
}

function addSubmoduleDiffLinks() {
	var containingElement = document.querySelectorAll("div#diff div.file, div#files div.file");
	var submoduleHashes = [];

	for (var i = 0; i < containingElement.length; i++) {
		var element = containingElement[i];
		
		var header = element.querySelectorAll("div.file-header");
		if (header.length != 1) {
			// Could not find file-header.
			log("Could not find file-header.");
			continue;
		}
		header = header[0];
		var filePath = header.getAttribute('data-path');
		
		var codeBlobs = element.querySelectorAll("td.blob-code-deletion, td.blob-code-addition");
	
		if (codeBlobs.length < 1 || codeBlobs.length > 2) {
			// Submodule blobs always contains one or two code blobs (add and/or remove).
			log("Submodule blob didn't contains one or two code blobs.");
			continue;
		}
	
		var firstCommit = codeBlobs[0].innerHTML.replace(/<[^>]*>/g, '');
		var secondCommit;
		if (codeBlobs[1]) {
			secondCommit = codeBlobs[1].innerHTML.replace(/<[^>]*>/g, '');
		}
	
		var matchFirstCommit = firstCommit.match(/\Subproject commit ([a-f0-9]{40})/);
		var matchSecondCommit;
		if (secondCommit) {
			matchSecondCommit = secondCommit.match(/\Subproject commit ([a-f0-9]{40})/);
		}
	
		if (!matchFirstCommit || (secondCommit && !matchSecondCommit)) {
			// Blob was not subproject related
			log("Blob was not subproject related");
			continue;
		}
		
		firstCommit = matchFirstCommit[1];
		if (secondCommit) {
			secondCommit = matchSecondCommit[1];
		}
		
		var fileActionsElm = header.querySelectorAll("div.file-actions");
		if (fileActionsElm.length != 1) {
			// Header-actions was not found.
			log("Header-actions was not found.");
			continue;
		}
		
		fileActionsElm = fileActionsElm[0];
		
		fetchSubmodulePaths(filePath, function(filePath, firstCommit, secondCommit, fileActionsElm, submodulePath) {
			if (submodulePath) {
				var diffUrl = 'https://github.com/' + submodulePath + '/compare/' + firstCommit + '...' + secondCommit;
				var firstCommitUrl = 'https://github.com/' + submodulePath + '/tree/' + firstCommit;
				var secondCommitUrl = 'https://github.com/' + submodulePath + '/tree/' + secondCommit;
				var diffMenu = fileActionsElm.querySelectorAll('div.submodule-diff');
				var classes = 'class="btn btn-sm tooltipped tooltipped-n"';
				
				var html ='';
				if (secondCommit) {
					html += '<a href="'+diffUrl+'" '+classes+' aria-label="View the diff between the old and the new submodule commit">Diff '+firstCommit.substring(0, 4)+'...'+secondCommit.substring(0, 4)+'</a> ';
				}
				html += '<a href="'+firstCommitUrl+'" '+classes+' aria-label="View the submodule commit">'+firstCommit.substring(0, 4)+'</a> ';
				if (secondCommit) {
					html += '<a href="'+secondCommitUrl+'" '+classes+' aria-label="View the submodule commit">'+secondCommit.substring(0, 4)+'</a>';
				}
			
				// Did we already add the menu?
				if (diffMenu.length == 0) {
					var elm = document.createElement('span');
					elm.className = "submodule-diff";
					elm.innerHTML = html;
					fileActionsElm.insertBefore( elm, fileActionsElm.childNodes[0] );
				} else {
					diffMenu[0].innerHTML = html;
				}
			} else {
				log("Could not find submodule: " + filePath);
			}
		}.bind(undefined, filePath, firstCommit, secondCommit, fileActionsElm));
	}
}

var gitmodulesBlob;
function fetchSubmodulePaths(filePath, callback) {
	var guessAtCurrentCommitForGitConfig = document.body.innerHTML.match(/commit\/([a-f0-9]{40})/)[1];
	var currentRepoPath = window.location.pathname.match(/\/[^\/]*\/[^\/]*\//)[0];
	var gitModulesPath = 'https://github.com' + currentRepoPath + 'blob/' + guessAtCurrentCommitForGitConfig + '/.gitmodules'
	
	if (gitmodulesBlob) {
		return findSubmodulePath(filePath, gitmodulesBlob, callback);
	} else {
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			gitmodulesBlob = xhr.responseText.match(/<div class="blob-wrapper data type-text">(\s|.)*?<\/div>/);
			if (!gitmodulesBlob) {
				log("Could not find .gitmodules content.");
				return callback();
			}
			// Remove HTML tags.
			gitmodulesBlob = gitmodulesBlob[0].replace(/<[^>]*>/g, '');
		
			return findSubmodulePath(filePath, gitmodulesBlob, callback);
		}
		xhr.open("GET", gitModulesPath);
		xhr.send();
	}
}

function findSubmodulePath(filePath, gitmodulesBlob, callback) {
	// Only look at the section related to the requested submodule
	log(gitmodulesBlob);
	var submodulePart = gitmodulesBlob.match(new RegExp('\\[submodule[^\\[]+'+filePath+'[^\\[]*'));
	
	if (!submodulePart) {
		log("Could not find correct submodule in .gitmodules.");
		return callback();
	}
	submodulePart = submodulePart[0];
	
	var submoduleRegexes = [/url\s*=[^>]*github\.com:([^<\s]*)\.git/, /url\s*=[^>]*git:\/\/github\.com\/([^<\s]*)\.git/, /url\s*=[^>]*https?:\/\/github\.com\/([^\s]+?)(\.git)?(\s|$)/];
	var submodules = [];
	var submodule;
	for (var i = 0; i < submoduleRegexes.length; i++) {
		submodule = submodulePart.match(submoduleRegexes[i]);
		if (submodule) {
			return callback(submodule[1]);
		}
	}
	log("Could not find matching github submodule url in blob.");
	return callback();
}

// Run on page load
addSubmoduleDiffLinks();

// Run every second in case the page was partially swapped in as GitHub loves to do
// TODO: find an event that reliably fires on soft page loads (URL change maybe? can't find an event for that)
var lastUrl = window.location.href;
setInterval(function() {
	if (window.location.href != lastUrl) {
		lastUrl = window.location.href;
		// If the URL changed because of an AJAX request, we need to wait some time for the request to complete.
		setTimeout(function  () {
			addSubmoduleDiffLinks();
		}, 500);
    }
}, 500);
