// get html elements
var url = document.querySelector(".url");
var timestamp = document.querySelector(".timestamp");
var files = document.querySelector(".files");
var status = document.querySelector('.status');
var cert = document.querySelector(".cert");
var hash = document.querySelector(".hash");
var signature = document.querySelector(".signature");

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

// add trust status
var statusHTML = "";
if(self.options.trust.hashes_match) {
  statusHTML += "Hashes match: <span style='color:green'>Yes</span>\n";
}
else{
  statusHTML += "Hashes match: <span style='color:red'>No</span>\n";
}
if(self.options.trust.certificate_trusted) {
  statusHTML += "Certificate trusted: <span style='color:green'>Yes</span>\n";
}
else{
  statusHTML += "Certificate trusted: <span style='color:red'>" + self.options.trust.certificate_trusted + "</span>\n";
}
if(self.options.trust.signature_valid) {
  statusHTML += "Signature valid: <span style='color:green'>Yes</span>\n";
}
else{
  statusHTML += "Signature valid: <span style='color:red'>No</span>\n";
}
status.innerHTML = statusHTML;

if(self.options.trust.hashes_match && self.options.trust.certificate_trusted && self.options.trust.signature_valid){
  status.style.backgroundColor = "#bfb";
}
else{
  status.style.backgroundColor = "#fbb";
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