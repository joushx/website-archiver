// get html elements
var url = document.querySelector(".url");
var timestamp = document.querySelector(".timestamp");
var files = document.querySelector(".files");
var errors = document.querySelector('.errors');
var cert = document.querySelector(".cert");
var hash = document.querySelector(".hash");
var signature = document.querySelector(".signature");
var errorWrapper = document.querySelector(".error-wrapper");

// set url
url.innerHTML = self.options.manifest.url;

// set timestamp
var time = self.options.manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.genTime;
var tokens = time.match("([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2}(\\.[0-9]+)?)Z");
var date = new Date();
date.setUTCFullYear(tokens[1], tokens[2], tokens[3]);
date.setUTCHours(tokens[4], tokens[5], tokens[6]);
timestamp.innerHTML = date;

// add list of files
var filesHTML = "";
self.options.manifest.files.forEach(function (item, index, array) {
  filesHTML += item.url + "\n";
});
files.innerHTML = filesHTML;

// add errors
if (self.options.errors) {
  // add list of errors
  var errorHTML = "";
  self.options.errors.forEach(function (item, index, array) {
    errorHTML += item + "\n";
  });

  errors.innerHTML = errorHTML;
}
else{

  // hide error section
  errorWrapper.style.display = "none";
}

// add hash
hash.innerHTML = self.options.manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.messageImprint.hash;

// add signature
signature.innerHTML = self.options.manifest.signature.timeStampToken.signedData.signerInfos[0].signature;

// add certificate information
var certs = self.options.manifest.signature.timeStampToken.signedData.certificates;
var certHtml = "";
certs.forEach(function(element, index, array){
  certHtml += element.serialNumber + " (" + element.issuer.commonName + ")\n";
});
cert.innerHTML = certHtml;