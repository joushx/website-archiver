/**
 * Main file of the extension
 * @module index
 * @author Johannes Mittendorfer
 */

var {Cc, Ci} = require("chrome");
var chrome = require("chrome");

var self = require("sdk/self");
var pref = require('sdk/simple-prefs');
var tabs = require("sdk/tabs");

var verify = require("verify");
var archiv = require("archiv");
var pkixtsp = require("pkixtsp");
var filepicker = require("filepicker");
var error = require("error");
var report = require("report");

// get window
let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
let window = wm.getMostRecentWindow("navigator:browser");

// load workaround for prefs
require('fennec-addon-preferences-workaround');

/**
 * Promts user for selection of archive
 * and verifies it afterwards
 */
function startVerification(){

  // promt for file
  var file = filepicker.openFile();

  // check if user selected a file
  if(file === null){
    return;
  }

  // do verification
  verify.verifyZIP(file, function(result, manifest){

    // show report HTML file
    report.showVerifyReport(manifest, result);
  });
}

/**
 * Main archive function
 */
function archive() {
  "use strict";

  // set target path
  let path = pref.prefs.targetdir;

  if (!path) {
    throw "Path cannot be null";
  }

  try {

    console.log("start archiving process");

    // get most recent browser window
    let window = wm.getMostRecentWindow("navigator:browser");

    // show notification for start of process
    window.NativeWindow.toast.show("Archiving page started", "short");

    // call main archive function
    archiv.archive(window.content, path, function(manifest, errors){

      console.log("archiving was successful");

      // show report HTML file
      report.showArchiveReport(manifest, errors);
    });

  } catch (err) {

    console.log(err);
    error.show(err);
  }
}

// listen for clicks on preference button to show manual
pref.on("manual", function() {
  tabs.open(self.data.url("manual/manual.html"));
});

// add button to menu
window.NativeWindow.menu.add({
  name: "Archive",
  icon: null,
  callback: function () {
    "use strict";

    archive();
  }
});

window.NativeWindow.menu.add({
  name: "Verify archive",
  icon: null,
  callback: function () {
    "use strict";

    startVerification();
  }
});
