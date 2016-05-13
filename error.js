/**
 * Module for displaying error messages
 * @module error
 * @author Johannes Mittendorfer
 */
var {Cc, Ci} = require("chrome");

function show(message){

  // get current window
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  var window = wm.getMostRecentWindow("navigator:browser");

  // show message
  window.alert(message);
}

exports.show = show;