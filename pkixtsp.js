/**
 * Module to create a timestamp sign request and
 * process the response
 * @module pkixtsp
 * @author Johannes Mittendorfer
 */
var {Cc, Ci, Cu} = require("chrome");
var xhr = require("sdk/net/xhr");
var pref = require('sdk/simple-prefs');

var rs = require('jsrsasign');

var cutil = require("convertutil");
var asn = require("asn1");
var error = require("error");
var hash = require("hash");
var verify = require("verify");

Cu.importGlobalProperties(['crypto']);

/**
 * Signs a hash
 * @param hash {string} A sha-1 hash as string
 * @param callback Callback function
 */
function sign(hashValue, callback) {
	"use strict";

	if(!hashValue || !callback){
    error.show("hash or callback cannot be null");
		throw("hash or callback cannot be null");
	}

  // create a random nonce
  var nonce = cutil.arrayToHex(crypto.getRandomValues(new Uint8Array(10)));

	// construct a PKIXTSP query
	var query = createQuery(hashValue, nonce);

	// execute query
	requestTimestamp(pref.prefs.timestampserver, query, function(responseASN){

    // parse response
		var response = parse(responseASN);

		// check status
		if(response.status.code !== 0){
			error.show("Response: " + object.status.description);
      throw "Response: " + object.status.description;
		}

    // check if response is of the same hash as we sent
    if(hashValue != response.timeStampToken.signedData.encapContentInfo.content.tstinfo.messageImprint.hash){
      error.show("Hashes do not match");
      throw "Hashes do not match";
    }

    // check if algorithm is the as we sent
    if(hash.getCurrentOID() != response.timeStampToken.signedData.encapContentInfo.content.tstinfo.messageImprint.algorithm.id){
      error.show("Digest algorithms do not match");
      throw "Digest algorithms do not match";
    }

    console.log(nonce);
    console.log(response.timeStampToken.signedData.encapContentInfo.content.tstinfo.nonce);

    if(nonce != response.timeStampToken.signedData.encapContentInfo.content.tstinfo.nonce){
      error.show("Nonce does not match");
      throw "Nonce does not match";
    }

    var signature = response.timeStampToken.signedData.signerInfos[0].signature;
    var digestAlgorithm = response.timeStampToken.signedData.signerInfos[0].digestAlgorithm.id;
    var data = response.timeStampToken.signedData.signerInfos[0].signedAttrs;

    // extract certificate that was used to sign
    var serialNr = response.timeStampToken.signedData.signerInfos[0].sid.serial;
    var key;
    response.timeStampToken.signedData.certificates.forEach(function(element, index, array){
      if(serialNr === element.serialNumber){
        key = element.subjectPublicKeyInfo;
      }
    });

    // replace implicit tag with SET tag at beginning according to RFC of CMS
    data = "31" + data.substr(2);

    verify.verifySignature(signature, data, key, digestAlgorithm, function(result) {

      if (!result) {
        error.show("Signature is invalid");
        throw "Signature is invalid";
      }

      callback(response);
    });
	});
}

/**
 * Parses a timestamp response
 * @param result {array} A byte array
 * @returns {object} The result object
 */
function parse(result){
  "use strict";

  // decode ASN.1 structure
  var asn1 = asn.decodeDER(result, 0, {});

  // parse response
  return parseTimestampResponse(asn1);
}

/**
 * Parses a status object
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseStatus(input){
  "use strict";

  var status = {};

  input.value.forEach(function(element, index, array){

    // code
    if(index === 0){
      status.code = element.value;
    }

    // description
    else if(index === 1){
      element.value.forEach(function(element, index, array){
        if(index === 0){
          status.description = element.value;
        }
      });
    }
  });

  return status;
}

/**
 * Parses a timestamptoken object
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseTimestampToken(input){
  "use strict";

  var timestampToken = {};

  input.value.forEach(function(element, index, array){

    // content type
    if(index === 0) {
      timestampToken.contentType = element.value;
    }

    // signed data
    else if(index === 1){
      timestampToken.signedData = {};

      element.value.forEach(function(element, index, array){
        if(index === 0){
          element.value.forEach(function(element, index, array) {

            // version
            if(index === 0) {
              timestampToken.signedData.version = element.value;
            }

            // digest algorithms
            else if(index === 1){
              timestampToken.signedData.digestAlgorithms = [];

              element.value.forEach(function(element, index, array) {

                var algorithm = {};

                element.value.forEach(function(element, index, array) {

                  // algorithm id
                  if(index === 0){
                    algorithm.id = element.value;
                  }

                  // parameter
                  if(index === 1){
                    algorithm.parameter = element.value;
                  }
                });

                timestampToken.signedData.digestAlgorithms.push(algorithm);
              });
            }

            // encapContentInfo
            else if(index === 2){
              timestampToken.signedData.encapContentInfo = {};

              element.value.forEach(function(element, index, array) {

                // algorithm id
                if(index === 0){
                  timestampToken.signedData.encapContentInfo.contentType = element.value;
                }

                // parameter
                if(index === 1){
                  timestampToken.signedData.encapContentInfo.content = {};

                  element.value.forEach(function(element, index, array) {
                    timestampToken.signedData.encapContentInfo.content.data = element.value;
                    timestampToken.signedData.encapContentInfo.content.tstinfo = parseTSTInfo(element.value);
                  });
                }
              });
            }

            // certificates
            else if(index === 3){
              timestampToken.signedData.certificates = [];

              element.value.forEach(function(element, index, array){
                var cert = {};

                element.value.forEach(function(element, index, array) {
                  if (index === 0) {
                    cert.signedCertificate = {};

                    element.value.forEach(function(element, index, array) {

                      if(index === 0){
                        cert.signedCertificate.version = element.value[0].value;
                      }

                      else if(index == 1){
                        cert.serialNumber = element.bytes;
                      }

                      else if(index == 2){
                        cert.signature = {};
                      }

                      else if(index == 3){
                        var issuer = {};

                        element.value.forEach(function(element, index, array){
                          if(index === 0){
                            issuer.country = element.value[0].value[1].value;
                          }
                          else if(index === 1){
                            issuer.orgName = element.value[0].value[1].value;
                          }
                          else if(index === 2){
                            issuer.orgUnitName = element.value[0].value[1].value;
                          }
                          else if(index === 3){
                            issuer.commonName = element.value[0].value[1].value;
                          }
                        });

                        cert.issuer = issuer;
                      }

                      else if(index == 4){
                        cert.validity = {};
                      }

                      else if(index == 5){
                        cert.subject = {};
                      }

                      else if(index == 6){
                        cert.subjectPublicKeyInfo = element.bytes;
                      }
                    });
                  }

                  else if (index === 1) {
                    cert.algorithmIdentifer = element.value[0].value;
                  }

                  else if (index === 2) {
                    cert.padding = element.value;
                  }

                  else if (index === 3) {
                    cert.encrypted = element.value;
                  }
                });

                cert.bytes = element.bytes;

                timestampToken.signedData.certificates.push(cert);
              });

            }

            // signer info
            else if(index === 4){
              timestampToken.signedData.signerInfos = [];

              element.value.forEach(function(element, index, array) {
                var signerInfo = {};

                element.value.forEach(function(element, index, array) {

                  // version
                  if(index === 0){
                    signerInfo.version = element.value;
                  }

                  // sid
                  else if(index === 1){
                    signerInfo.sid = {};

                    signerInfo.sid.issuer = {};
                    signerInfo.sid.serial = element.value[1].bytes;
                  }

                  // digest algorithm
                  else if(index === 2){
                    signerInfo.digestAlgorithm = parseAlgorithm(element);
                  }

                  // signed attributes
                  else if(index === 3){
                    signerInfo.signedAttrs = element.bytes;
                  }

                  // signature algorithm
                  else if(index === 4){
                    signerInfo.signatureAlgorithm = {};
                  }

                  //signature
                  else if(index === 5){
                    signerInfo.signature = element.value;
                  }
                });

                timestampToken.signedData.signerInfos.push(signerInfo);
              });
            }
          });
        }
      });
    }
  });

  return timestampToken;
}

/**
 * Parses a tstinfo object
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseTSTInfo(input){
  var data = asn.decodeDER(cutil.hexToArray(input), 0, {});
  var tst = {};

  var index = 0;
  data.value.forEach(function(element, index, array){

    // version                      INTEGER  { v1(1) },
    if(index === 0){
      tst.version = element.value;
    }

    // policy                       TSAPolicyId,
    else if(index === 1){
      tst.policy = element.value;
    }

    // messageImprint               MessageImprint,
    // -- MUST have the same value as the similar field in
    // -- TimeStampReq
    else if(index === 2){

      tst.messageImprint = {};

      element.value.forEach(function(element, index, array){
        if(index === 0){
          tst.messageImprint.algorithm = parseAlgorithm(element);
        }

        else if(index === 1){
          tst.messageImprint.hash = element.value;
        }
      });

    }

    // serialNumber                 INTEGER,
    // -- Time-Stamping users MUST be ready to accommodate integers
    // -- up to 160 bits.
    else if(index === 3){
      tst.serialNumber = element.value;
    }

    // genTime                      GeneralizedTime,
    else if(index === 4){
      tst.genTime = element.value;
    }

    if(index > 4){

      // accuracy                     Accuracy                 OPTIONAL,
      if(element.type == "SEQUENCE"){
        tst.accuracy = {};
      }

      // ordering                     BOOLEAN             DEFAULT FALSE,
      else if(element.type == "BOOLEAN"){
        tst.ordering = element.value;
      }

      // nonce                        INTEGER                  OPTIONAL,
      // -- MUST be present if the similar field was present
      // -- in TimeStampReq.  In that case it MUST have the same value.
      else if(element.type == "INTEGER"){
        tst.nonce = element.bytes.substring(4);
      }

      // tsa                          [0] GeneralName          OPTIONAL,
      // extensions                   [1] IMPLICIT Extensions   OPTIONAL
    }

    index++;
  });

  return tst;
}

/**
 * Parses a timestamp object
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseTimestampResponse(input){
	"use strict";

	var data = {};

	input.value.forEach(function(element, index, array){

		// status
		if(index === 0){
			data.status = parseStatus(element);
		}

		// timestamp token
		else if(index === 1) {
      data.timeStampToken = parseTimestampToken(element);
    }

	});

	return data;
}

/**
 * Parses a algorithmobject
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseAlgorithm(input){
  "use strict";

  var algorithm = {};

  input.value.forEach(function(element, index, array) {

    // algorithm id
    if(index === 0){
      algorithm.id = element.value;
    }

    // parameter
    if(index === 1){
      algorithm.parameter = element.value;
    }
  });

  return algorithm;
}

/**
 * Parses a timestamptokeninfo object
 * @param input {array} The byte array
 * @returns {object} The result object
 */
function parseTTI(input){

  var ttt = {};

  input.value.forEach(function(element, index, array){

    if(index === 0){
      ttt.version = element.value;
    }

    else if(index === 1){
      ttt.policy = element.value;
    }

    else if(index === 2){
      ttt.messageImprint = {};

      element.value.forEach(function(element, index, array){
        if(index === 0){
          ttt.messageImprint.hashAlgorithm = parseAlgorithm(element);
        }

        else if(index === 1){
          ttt.messageImprint.hashedMessage = element.value;
        }
      });
    }

    else if(index === 3){
      ttt.serialNumber = element.value;
    }

    else if(index === 4){
      ttt.genTime = element.value;
    }
  });

  return ttt;
}

/**
 * Requests a timestamp
 * @param url {string} The URL of a compatible timestamp server
 * @param query {string} A ASN.1 encoded timestamp query as hex string
 * @param callback {function} A function that gets called when a response arrived
 */
function requestTimestamp(url, query, callback){
	"use strict";

  console.log("request timestamp");

  var view = new Uint8Array(cutil.hexToArray(query));

	var oReq = new xhr.XMLHttpRequest();

  oReq.onload = function (oEvent) {
    var arrayBuffer = oReq.response;
    if (arrayBuffer) {
      var byteArray = new Uint8Array(arrayBuffer);
      callback(byteArray);
    }
    else{
      throw "Response undefined";
    }
  };

  // onError
  oReq.addEventListener("error", function(){
    throw "Request to timestamp server failed";
  });

  oReq.open("POST", url);
  oReq.responseType = "arraybuffer";
  oReq.setRequestHeader("Content-Type", "application/timestamp-query");
	oReq.send(view);
}

/**
 * Creates a timestamp query from a given sha-1 hash
 * @param hash {string} A sha-1 hash to be signed
 * @returns {string} Query as byte string
 */
function createQuery(hashValue, nonce){
	"use strict";

  console.log("create query");

  var request = new rs.asn1.tsp.TimeStampReq(
    {
      mi: new rs.asn1.tsp.MessageImprint({hashAlg: pref.prefs.algorithm, hashValue: hashValue}),
      nonce: {
        hex: nonce
      },
      certreq: true
    }
  );

	return request.getEncodedHex();
}

exports.sign = sign;
exports._createQuery = createQuery;
exports._requestTimestamp = requestTimestamp;
exports._parse = parse;
exports._parseTTI = parseTTI;
exports._parseTimestampToken = parseTimestampToken;