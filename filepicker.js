/**
 * Module to display a file picker
 * @module filepicker
 * @author Johannes Mittendorfer
 */
var {Cc, Ci} = require("chrome");

/**
 * Promts for a folder selection
 */
function openFile() {

  // create filepicker instance
  var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

  // get current window
  var window = require("sdk/window/utils").getMostRecentBrowserWindow();

  // show fileficker
  fp.init(window, "Select a archive", Ci.nsIFilePicker.modeOpen);
  fp.appendFilters(Ci.nsIFilePicker.filterAll);
  var rv = fp.show();

  // check response
  if (rv === Ci.nsIFilePicker.returnOK || rv === Ci.nsIFilePicker.returnReplace) {
    return fp.file.path;
  }
  else{
    return null;
  }

}

exports.openFile = openFile;
