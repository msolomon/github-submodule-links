.PHONY: chrome firefox safari

all: chrome firefox safari

chrome: link_maker.js
	mkdir -p build/chrome
	cp manifest.json link_maker.js icon-128.png build/chrome/
	rm -f build/chrome/extension.zip
	cd build/chrome && zip extension.zip *

safari: link_maker.js
	mkdir -p build/safari.safariextension
	cp Info.plist link_maker.js icon-*.png build/safari.safariextension/

firefox: build/jetpack-sdk-latest.zip link_maker.js
	mkdir -p build/firefox
	mkdir -p build/firefox/lib
	mkdir -p build/firefox/data
	cp package.json icon-64.png build/firefox/
	cp link_maker.js build/firefox/data/
	cp main.js build/firefox/lib/

build/jetpack-sdk-latest.zip:
	mkdir -p build
	cd build && wget https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/jetpack-sdk-latest.zip
	cd build && unzip -q jetpack-sdk-latest.zip

clean:
	rm -r build
