/**
 * Module to verify a previously archived website
 * @module verify
 * @author Johannes Mittendorfer
 */

// import sdk modules
var {Cc, Ci, Cu} = require("chrome");
var io = require("sdk/io/file");

// import project modules
var cutil = require("convertutil");
var hash = require("hash");
var error = require("error");

// import XPCOM modules
var fu = Cu.import('resource://gre/modules/FileUtils.jsm').FileUtils;

// import global js objects
Cu.importGlobalProperties(['crypto']);

/**
 * Verifies the contents and signature of a ZIP archive
 * @param {string} path Path to the zip file
 * @param {function} callback Function that is called with result when validation is done
 */
function verifyZIP(path, callback) {
	"use strict";

  if(!path){
    error.show("path cannot be null");
    throw "path cannot be null";
  }

  if(!callback){
    error.show("path cannot be null");
    throw "path cannot be null";
  }

  var manifest;
  var contentsStream;

  // open zip
  var zipr = Cc['@mozilla.org/libjar/zip-reader;1'].createInstance(Ci.nsIZipReader);
  var zipFile = fu.File(path);
  zipr.open(zipFile);

	// Parse zip contents
  var entries = zipr.findEntries('*');
  var scriptableInputstream = Cc['@mozilla.org/scriptableinputstream;1'].createInstance(Ci.nsIScriptableInputStream);
  while(entries.hasMore()){

    // get entry
    var entryPointer = entries.getNext();
    var entry = zipr.getEntry(entryPointer);

    // extract manifest file
    if(entryPointer === "manifest") {

      // read contents
      var inputStream = zipr.getInputStream(entryPointer);
      scriptableInputstream.init(inputStream);
      var fileContents = scriptableInputstream.read(entry.realSize);

      // read manifest
      manifest = JSON.parse(fileContents);
    }

    // extract contents
    else if(entryPointer === "content.zip"){

      // get stream contents
      contentsStream = zipr.getInputStream(entryPointer);
    }
  }

  // check if required files could be found
  if(!manifest){
    error.show("No manifest found");
    throw "No manifest found";
  }

  if(!contentsStream){
    error.show("No content found");
    throw "No content found";
  }

  // hash archive
  var digestAlgorithm = manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.messageImprint.algorithm.id;
  var contentsHash = hash.hashStream(contentsStream, digestAlgorithm);

  // verify the manifest found in the archive (signature, etc...)
  verifyManifest(contentsHash, manifest, callback);

}

/**
 * Verifies a parsed manifest object
 * @param contentsHash A hash as hex string that should match the hash in the manifest
 * @param manifest The maifest as object
 * @callback callback Function that is called after verification finished; includes a result object
 */
function verifyManifest(contentsHash, manifest, callback){

  // create object for results
  var result = {
    time: "",
    hashes_match: false,
    certificate_trusted: false,
    signature_valid: false
  };

  // save signed timestamp value
  result.time = manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.genTime;

  // check if hashes in manifest and in reallity match
  if(contentsHash === manifest.signature.timeStampToken.signedData.encapContentInfo.content.tstinfo.messageImprint.hash) {
    result.hashes_match = true;
  }

  // extract certificate that was used to sign & import intermediate certs
  var certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(Ci.nsIX509CertDB);
  var serialNr = manifest.signature.timeStampToken.signedData.signerInfos[0].sid.serial;
  var key;

  manifest.signature.timeStampToken.signedData.certificates.forEach(function(element, index, array){

    // check if that one used for signing
    if(serialNr === element.serialNumber){

      // save for checking
      key = element;
    }
    else{

      // import for cert chain
      var base64 = cutil.hexToBase64(element.bytes);
      certdb.addCertFromBase64(base64, ",,", null);
    }
  });

  // check trust status
  var cert = certdb.constructX509FromBase64(cutil.hexToBase64(key.bytes));

  var arr = cert.getChain().enumerate();
  while(arr.hasMoreElements()){
    var elem = arr.getNext().QueryInterface(Ci.nsIX509Cert);

    var verifyResult = {};
    var count = {};
    var usages = {};
    elem.getUsagesArray(false, verifyResult, count, usages);

    if(verifyResult.value === 0) {
      result.certificate_trusted = true;
    }
    else if(verifyResult.value === 1 << 1){
      result.certificate_trusted = "revoked";
    }
    else if(verifyResult.value === 1 << 2){
      result.certificate_trusted = "expired";
    }
  }

  // extract data for signature verification of (and only) first signerInfo structure
  var signature = manifest.signature.timeStampToken.signedData.signerInfos[0].signature;
  var digestAlgorithm = manifest.signature.timeStampToken.signedData.signerInfos[0].digestAlgorithm.id;
  var data = manifest.signature.timeStampToken.signedData.signerInfos[0].signedAttrs;
  var signatureAlgorithm = manifest.signature.timeStampToken.signedData.signerInfos[0].signatureAlgorithm.id;

  // replace implicit tag with SET tag at beginning according to RFC of CMS
  data = "31" + data.substr(2);

  // verify cryptographic signature
  verifySignature(signatureAlgorithm, signature, data, key.subjectPublicKeyInfo, digestAlgorithm, function(isvalid){

    // save result
    result.signature_valid = isvalid;

    // return result object
    callback(result, manifest);
  });
}

/**
 * Verifies a RSASSA-PKCS1-v1_5 or ECDSA signature
 * @param algorithm The oid of the used signature algorithm
 * @param signature The signature as hex string
 * @param data The data on which the signature was computed
 * @param publicKey The public key for the private key that was used to compute the hash
 * @param digestAlgorithm OID string of the digest algorihtm used to hash content for signature
 * @param callback A function called when the verification is finished
 */
function verifySignature(signatureAlgorithm, signature, data, publicKey, digestAlgorithm, callback) {

  switch (signatureAlgorithm) {
    case "1.2.840.113549.1.1.1":
      // RSA
      verifyRSA(signature, data, publicKey, digestAlgorithm, callback);
      break;
    case "1.2.840.10045.4.3.2":
      // ECDSA
      verifyECDSA(signature, data, publicKey, digestAlgorithm, callback);
      break;
    default:
      error.show("Signature algorithm not supported: " + signatureAlgorithm);
  }
}

/**
 * Verifies a RSASSA-PKCS1-v1_5 signature
 * @param signature The signature as hex string
 * @param data The data on which the signature was computed
 * @param publicKey The public key for the private key that was used to compute the hash
 * @param digestAlgorithm OID string of the digest algorihtm used to hash content for signature
 * @param callback A function called when the verification is finished
 */
function verifyRSA(signature, data, publicKey, digestAlgorithm, callback) {

  crypto.subtle.importKey(
    "spki",
    new Uint8Array(cutil.hexToArray(publicKey)),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: {name: getNameForOID(digestAlgorithm)}
    },
    false,
    ["verify"]
    )
    .then(function(publicKey){

      crypto.subtle.verify(
        {
          name: "RSASSA-PKCS1-v1_5"
        },
        publicKey,
        new Uint8Array(cutil.hexToArray(signature)),
        new Uint8Array(cutil.hexToArray(data))
        )
        .then(function(isvalid){
          callback(isvalid);
        })
        .catch(function(err){
          error.show(err);
          throw(err);
        });

    })
    .catch(function(err){
      error.show(err);
      throw(err);
    });
}

/**
 * Verifies a ECDSA signature
 * @param signature The signature as hex string
 * @param data The data on which the signature was computed
 * @param publicKey The public key for the private key that was used to compute the hash
 * @param digestAlgorithm OID string of the digest algorihtm used to hash content for signature
 * @param callback A function called when the verification is finished
 */
function verifyECDSA(signature, data, publicKey, digestAlgorithm, callback) {

  crypto.subtle.importKey(
    "spki",
    new Uint8Array(cutil.hexToArray(publicKey)),
    {
      name: "ECDSA",
      hash: {name: getNameForOID(digestAlgorithm)}
    },
    false,
    ["verify"]
    )
    .then(function(publicKey){

      crypto.subtle.verify(
        {
          name: "ECDSA"
        },
        publicKey,
        new Uint8Array(cutil.hexToArray(signature)),
        new Uint8Array(cutil.hexToArray(data))
        )
        .then(function(isvalid){
          callback(isvalid);
        })
        .catch(function(err){
          error.show(err);
          throw(err);
        });

    })
    .catch(function(err){
      error.show(err);
      throw(err);
    });
}

/**
 * Returns the name string for an OID
 * @param oid {string} A OID string
 * @returns {string} The name usable in WebCrypto functions
 */
function getNameForOID(oid){
  switch (oid){
    case "1.3.14.3.2.26":
      return "SHA-1";
    case "2.16.840.1.101.3.4.2.1":
      return "SHA-256";
    case "2.16.840.1.101.3.4.2.2":
      return "SHA-384";
    case "2.16.840.1.101.3.4.2.3":
      return "SHA-512";
    default:
      error.show("Unknown hash algorithm");
      throw("Unknown hash algorithm");
  }
}

exports.verifyZIP = verifyZIP;
exports.verifySignature = verifySignature;
exports.verifyManifest = verifyManifest;
