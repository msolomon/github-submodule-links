var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");

pageMod.PageMod({
  include: "*.github.com",
  contentScriptFile: data.url("link_maker.js")
});
