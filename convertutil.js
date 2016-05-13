/**
 * Various data conversion utils (hex, binary, base64, etc...)
 * @module convertutil
 * @author Johannes Mittendorfer
 */

const { atob } = require("resource://gre/modules/Services.jsm");
const { btoa } = require("resource://gre/modules/Services.jsm");

/**
 * Converts a array of bytes
 * to a hex string
 * @param buffer {array} A array of bytes
 * @returns {string} The hex string
 */
function arrayToHex(buffer){
  "use strict";

  var str = "";

  for(var i = 0; i < buffer.length; i++){
    if(buffer[i] < 16){
      str+= "0";
    }
    str += buffer[i].toString(16);
  }
  return str;
}

/**
 * Converts a hex string to a byte array
 * @param hex {string} A hex string
 * @returns {Array} The byte array
 */
function hexToArray(hex) {
  "use strict";

  for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

/**
 * Converts a hex string to a string
 * @param hex {string} A hex string
 * @returns {string} The string
 */
function hexToString(hex){
  "use strict";

  var bytes = [], str;

  for(var i=0; i< hex.length-1; i+=2)
    bytes.push(parseInt(hex.substr(i, 2), 16));

  return String.fromCharCode.apply(String, bytes);
}

/**
 * Converts a base-64 encoded string to array
 * @param base64 {string} A base-64 encoded string
 * @returns {Array} The array of bytes
 */
function base64ToArray(base64) {
  var binary_string =  atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++)        {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a hex string to a base-64 string
 * @param str {string} A base-64 string
 * @return {string} A hex string
 */
function hexToBase64(str) {
  return btoa(hexToString(str));
}

/**
 * Converts a string to a hex string
 * @param string {string} A string
 * @returns {string} A hex stream
 */
function stringToHex(string){
  var hex, i;

  var result = "";
  for (i=0; i < string.length; i++) {
    hex = string.charCodeAt(i).toString(16);

    if(hex.length == 1){
      hex = "0" + hex;
    }

    result += hex;
  }

  return result;
}

exports.hexToArray = hexToArray;
exports.arrayToHex = arrayToHex;
exports.hexToString = hexToString;
exports.base64ToArray = base64ToArray;
exports.stringToHex = stringToHex;
exports.hexToBase64 = hexToBase64;