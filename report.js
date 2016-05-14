/**
 * Creates report pages
 * @module report
 * @author Johannes Mittendorfer
 */

var self = require("sdk/self");
var tabs = require("sdk/tabs");
var pageMod = require("sdk/page-mod");

/**
 * Shows a HTML report
 * @param manifest {object} A manifest object
 * @param errors {array} The list of errors
 * @param trust {array} A array of the cert check result
 */
function showReport(manifest, errors, trust) {
  "use strict";

  tabs.open(self.data.url("report/report.html"));

  // set page URL
  var html = 'document.querySelector(".url").innerHTML = "' +
    manifest.url + '";\n';

  // add timestamp information
  html += 'document.querySelector(".timestamp").innerHTML = "' +
    manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.genTime + '";\n';

  // add list of files
  var filesHTML = "";
  manifest.files.forEach(function (item, index, array) {
    filesHTML += item.url + "\\n";
  });
  html += 'document.querySelector(".files").innerHTML = "' + filesHTML + '";\n';

  if (errors) {
    // add list of errors
    var errorHTML = "";
    errors.forEach(function (item, index, array) {
      errorHTML += item + "\\n";
    });
    html += "document.querySelector('.errors').innerHTML = '" + errorHTML + "';\n";
  }

  // add signature information
  var signature = 'document.querySelector(".signature").innerHTML = "' +
    manifest.signature.timeStampToken.signedData.certificates[
      manifest.signature.timeStampToken.signedData.certificates.length - 1
    ].serialNumber + " (" + manifest.signature.timeStampToken.signedData.certificates[
      manifest.signature.timeStampToken.signedData.certificates.length - 1
    ].issuer.commonName + ')";\n';

  if (trust) {
    signature += "document.querySelector('.signature').innerHTML = '" +
      "Hashes match: " + trust.hashes_match + "\\n" +
      "Certificate trusted: " + trust.certificate_trusted + "\\n" +
      "Signature valid: " + trust.signature_valid + "';";
  }
  html += signature;

  // add script to page
  pageMod.PageMod({
    include: "resource://archiver/data/report/report.html",
    contentScript: html
  });
}

exports.showReport = showReport;
