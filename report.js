/**
 * Creates report pages
 * @module report
 * @author Johannes Mittendorfer
 */

var self = require("sdk/self");
var tabs = require("sdk/tabs");
var pageMod = require("sdk/page-mod");

/**
 * Shows a HTML report for archiving
 * @param manifest {object} A manifest object
 * @param errors {array} The list of errors
 * @param trust {array} A array of the cert check result
 */
function showArchiveReport(manifest, errors, trust) {
  "use strict";

  tabs.open({
    url: self.data.url("report/report-archive.html"),
    inBackground: false,
    onReady: function(tab)
    {
      tab.attach({
        contentScriptFile: self.data.url("report/report-archive.js"),
        contentScriptOptions: {
          manifest: manifest,
          errors: errors
        }
      });
    }
  });
}

/**
 * Shows a HTML report for verifying
 * @param manifest {object} A manifest object
 * @param errors {array} The list of errors
 * @param trust {array} A array of the cert check result
 */
function showVerifyReport(manifest, trust) {
  "use strict";

  tabs.open({
    url: self.data.url("report/report-verify.html"),
    inBackground: false,
    onReady: function(tab)
    {
      tab.attach({
        contentScriptFile: self.data.url("report/report-verify.js"),
        contentScriptOptions: {
          manifest: manifest,
          trust: trust
        }
      });
    }
  });
}

exports.showArchiveReport = showArchiveReport;
exports.showVerifyReport = showVerifyReport;