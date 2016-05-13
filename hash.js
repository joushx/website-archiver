/**
 * Module to create file hashes
 * @module hash
 * @author Johannes Mittendorfer
 */
var {Cc, Ci} = require("chrome");
var ch = Cc['@mozilla.org/security/hash;1'].createInstance(Ci.nsICryptoHash);
var f = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
var pref = require('sdk/simple-prefs');
var cutil = require("convertutil");
var error = require("error");

/**
 * Returns a the hashing algorithm
 * from the current preference value
 * @returns {object} A nsICryptoHash algorithm object
 */
function getAlgorithm(){
  var value = pref.prefs.algorithm;

  switch (value){
    case "sha1":
      return ch.SHA1;
    case "sha256":
      return ch.SHA256;
    case "sha384":
      return ch.SHA384;
    case "sha512":
      return ch.SHA512;
    default:
      error.show("Unknown hash algorithm");
      throw("Unknown hash algorithm");
  }
}

/**
 * Returns a hashing algorithm
 * from a OID value
 * @param value {string} A oid String
 * @returns {object} A nsICryptoHash algorithm object
 */
function getAlgorithmForOID(value){
  switch (value){
    case "1.3.14.3.2.26":
      return ch.SHA1;
    case "2.16.840.1.101.3.4.2.1":
      return ch.SHA256;
    case "2.16.840.1.101.3.4.2.2":
      return ch.SHA384;
    case "2.16.840.1.101.3.4.2.3":
      return ch.SHA512;
    default:
      error.show("Unknown hash algorithm");
      throw("Unknown hash algorithm");
  }
}

/**
 * Returns a hashing algorithm
 * from the current preference value
 * @returns {string} The OID value
 */
function getCurrentOID(){
  var value = pref.prefs.algorithm;

  switch (value){
    case "sha1":
      return "1.3.14.3.2.26";
    case "sha256":
      return "2.16.840.1.101.3.4.2.1";
    case "sha384":
      return "2.16.840.1.101.3.4.2.2";
    case "sha512":
      return "2.16.840.1.101.3.4.2.3";
    default:
      error.show("Unknown hash algorithm");
      throw("Unknown hash algorithm");
  }
}

/**
 * Hashes a given file
 * @param {string} path The path to the file
 * @returns {string} The SHA-1 hash of the file
 */
function hashFile(path) {
  "use strict";

  f.initWithPath(path);

  // open for reading
  var istream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
  istream.init(f, 0x01, 444, 0);

  return hashStream(istream);
}

/**
 * Calculates a hash for a stream. If no algorithm
 * is specified, the one from the preferences is used
 * @param stream {object} A nsIInputStream
 * @param algorithm The algorithm to use as OID
 * @returns {string} The hash as hex string
 */
function hashStream(stream, algorithm) {
  "use strict";

  // check if algorithm is passed
  if(!algorithm){

    // use algorithm from settings
    ch.init(getAlgorithm());
  }
  else{

    // use algorithm for passed OID
    ch.init(getAlgorithmForOID(algorithm));
  }

  // read the entire file
  const PR_UINT32_MAX = 0xffffffff;

  // create hash
  ch.updateFromStream(stream, PR_UINT32_MAX);
  var hash = ch.finish(false);

  return cutil.stringToHex(hash);
}

exports.hashFile = hashFile;
exports.hashStream = hashStream;
exports.getCurrentOID = getCurrentOID;