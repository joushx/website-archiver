/**
 * Module to encode and decode ASN.1 in DER
 * @module asn1
 * @author Johannes Mittendorfer
 */

/**
 * @typedef {Object} Length
 * @property {number} value - The length encoded
 * @property {number} additionalBytes - The number of bytes used for encoding the length
 */

/**
 * @typedef {Object} ASN1
 * @property {string} type - The type of the tag (SEQUENCE, INTEGER, etc...)
 * @property {number} size - The size of the object in bytes including all header bytes
 * @property {ASN1[]|number|string} value - The value of the object
 */

var error = require("error");
var cutil = require("convertutil");

var BOOLEAN = 0x1;
var INTEGER = 0x2;
var BIT_STRING = 0x3;
var OCTET_STRING = 0x4;
var NULL = 0x5;
var OBJECT_IDENTIFIER = 0x6;
var SEQUENCE = 0x30;
var UTF8_STRING = 0xc;
var PRINTABLE_STRING = 0x13;
var UTC_TIME = 0x17;
var GENERALIZED_STRING = 0x18;
var SET = 0x31;

/**
 * Decodes DER encoded ASN.1 objects
 * @param {Array} data The data to be decoded
 * @param {number} position The position of the pointer
 * @param {object} object The object to use for building the object
 * @returns {ASN1} The ASN.1 represented as object
 */
function decodeDER(data, position, object){
  "use strict";

  var length = decodeLength(data, position);
  var type;
  switch (data[position]){
    case 0xa0:
    case 0xa1:
    case 0xa2:
    case 0xa3:
    case 0xa4:
    case 0xa5:
    case SET:
    case SEQUENCE:
      switch(data[position]){
        case 0xa0:
        case 0xa1:
        case 0xa2:
        case 0xa3:
        case 0xa4:
        case 0xa5:
          type = "IMPLICIT";
          break;
        case SET:
          type = "SET";
          break;
        case SEQUENCE:
          type = "SEQUENCE";
          break;
      }

      var bytes = cutil.arrayToHex(data.slice(position, position+2+length.additionalBytes+length.value));

      var children = [];
      var sum = 0;
      while(sum < length.value){
        let current = decodeDER(data, position+2+length.additionalBytes, object);

        sum += current.size;
        position += current.size;
        children.push(current);
      }

      return {
        type: type,
        size: length.value +2+ length.additionalBytes,
        value: children,
        bytes: bytes
      };

    case INTEGER:
      return {
        type: "INTEGER",
        size: length.value+length.additionalBytes+2,
        value: decodeInteger(data.slice(position+2+length.additionalBytes, position+2+length.additionalBytes+length.value)),
        bytes: cutil.arrayToHex(data.slice(position, position+2+length.additionalBytes+length.value))
      };
    case BIT_STRING:
      return {
        type: "BIT_STRING",
        size: length.value+length.additionalBytes+2,
        value: cutil.arrayToHex(data.slice(position+3+length.additionalBytes, position+2+length.additionalBytes+length.value))
      };
    case OBJECT_IDENTIFIER:
      return {
        type: "OBJECT_IDENTIFIER",
        size: length.value+2,
        value: decodeOID(data.slice(position+2, position+2+length.value))
      };
    case OCTET_STRING:
      return {
        type: "OCTET_STRING",
        size: length.value+2+length.additionalBytes,
        value: cutil.arrayToHex(data.slice(position+2+length.additionalBytes, position+2+length.additionalBytes+length.value))
      };
    case UTF8_STRING:
    case GENERALIZED_STRING:
    case PRINTABLE_STRING:
      type = data[position];
      return {
        type: type === UTF8_STRING ? "UTF8_STRING": "PRINTABLE_STRING",
        size: length.value+2+length.additionalBytes,
        value: decodePrintableString(data.slice(position+2+length.additionalBytes, position+2+length.value+length.additionalBytes))
      };
    case NULL:
      return {
        type: "NULL",
        size: 2,
        value: null
      };
    case UTC_TIME:
      return {
        type: "UTC_TIME",
        size: length.value+2+length.additionalBytes,
        value: decodeString(data.slice(position+2+length.additionalBytes, position+2+length.value+length.additionalBytes))
      };
    case BOOLEAN:
      return {
        type: "BOOLEAN",
        size: 3,
        value: data[position+2] !== 0x0
      };
    case 163:
      return {
        type: 163,
        size: length.value+2+length.additionalBytes,
        value: null
      };
    default:
      error.show("Unknown type 0x" + data[position].toString(16));
      throw "Unknown type 0x" + data[position].toString(16);
  }
}

/**
 * Decodes a object identifier
 * @param {Array} array The oid bytes
 * @returns {string} The result separated with dots (e.g. 1.2.3.4)
 */
function decodeOID(array){
  "use strict";

  let parts = [];

  // decode first byte as two symbols
  parts.push(Math.floor(array[0] / 40));
  parts.push(array[0] % 40);

  // decode other bytes
  for(let i = 1; i < array.length; i++) {
    let value = 0;

    // decode additional bytes with '1' at bit 7
    while ((array[i] >> 7) === 1) {

      // make space
      value = value << 7;

      // use bytes 0-6
      value |= array[i] & 0x7f;

      // go to next
      i++;
    }

    // handle last byte
    value = value << 7;
    value |= array[i] & 0x7f;

    parts.push(value);
  }

  // return a dot separated string
  return parts.join(".");
}

/**
 * Decodes a printable string object
 * @param {Array} array The input bytes
 * @returns {string} The result string
 */
function decodePrintableString(array){
  "use strict";
  return decodeString(array);
}

/**
 * Decodes a octet string object
 * @param {Array} array The input bytes
 * @returns {string} The value as hex string
 */
function decodeOctetString(array){
  "use strict";

  var result = "";
  for (var i = 0; i < array.length; i++) {
    if(array[i] < 16){
      result += "0";
    }
    result += array[i].toString(16);
  }
  return result;
}

/**
 * Decodes the length value of ASN.1 objects
 * It takes into account if more than one bytes is used
 *
 * @param {Array} array The bytes
 * @param {number} position The position of the pointer (the first byte of the object)
 * @returns {Length} The length as encoded in the given bytes
 */
function decodeLength(array, position){
  "use strict";

  let additionalBytes = 0;
  let length = 0;

  // check if more than one byte is used
  if((array[position+1] >> 7) === 1){

    // decode number of bytes used
    additionalBytes = (array[position+1] & 0x7f);

    // decode additional bytes
    for(let i = 0; i < additionalBytes; i++){

      if(i === additionalBytes-1) { // https://msdn.microsoft.com/en-us/library/bb648645%28v=vs.85%29.aspx
        length |= array[position + 2+i];
      }
      else {
        length |= array[position + 2+i] << (additionalBytes-1 - i)*8;
      }
    }
  }
  else{
    length = array[position+1];
  }

  return {value: length, additionalBytes: additionalBytes};
}

/**
 * Generic method to decode variable types of strings
 * @param {Array} array Bytes of the string
 * @returns {string} The string
 */
function decodeString(array){
  "use strict";

  let result = "";
  for (var i = 0; i < array.length; i++) {
    result += String.fromCharCode(array[i]);
  }
  return result;
}

/**
 * Decodes a integer from one or more bytes
 * @param {Array} array The array of bytes
 */
function decodeInteger(array){
  "use strict";

  let value = 0;

  for(let i = 0; i < array.length; i++){
    value = value << 8;
    value |= array[i];
  }

  return value;
}

//exports.encodeDER = encodeDER;
exports.decodeDER = decodeDER;
exports._decodeOID = decodeOID;
exports._decodePrintableString = decodePrintableString;
exports._decodeOctetString = decodeOctetString;
exports._decodeLength = decodeLength;