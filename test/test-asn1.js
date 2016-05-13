/**
 * Tests the behaviour of asn1.js
 */

var asn = require("../asn1");
var io = require("sdk/io/file");

exports["test decode oid country"] = function(assert) {
	var input = [0x55, 0x04, 0x06];
	var actual = asn._decodeOID(input);
	var expected = "2.5.4.6";

	assert.equal(expected, actual);
};

exports["test decode oid sha1"] = function(assert) {
	var input = [0x2b, 0x0e, 0x03, 0x02, 0x1a];
	var actual = asn._decodeOID(input);
	var expected = "1.3.14.3.2.26";

	assert.equal(expected, actual);
};

exports["test decode oid big values"] = function(assert) {
	var input = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x10, 0x01, 0x04];
	var actual = asn._decodeOID(input);
	var expected = "1.2.840.113549.1.9.16.1.4";

	assert.equal(expected, actual);
};

exports["test decode printable string"] = function(assert) {
	var input = [0x44, 0x46, 0x4e, 0x2d, 0x56, 0x65, 0x72, 0x65, 0x69, 0x6e];
	var actual = asn._decodePrintableString(input);
	var expected = "DFN-Verein";

	assert.equal(expected, actual);
};

exports["test decode octet string"] = function(assert) {
	var input = [0x43, 0x67, 0x1c, 0xe7, 0xe6, 0x1b, 0xee, 0xc0, 0x89, 0x52, 0x8e, 0xd1, 0xf2, 0x0a, 0x2c, 0x3c, 0x92, 0xcd, 0x40, 0xa2];
	var actual = asn._decodeOctetString(input);
	var expected = "43671ce7e61beec089528ed1f20a2c3c92cd40a2";

	assert.equal(expected, actual);
};

exports["test decode simple DER"] = function(assert) {
	var input = [0x30, 0x06, 0x2, 0x1, 0x5, 0x2, 0x1, 0x8];
	var result = asn.decodeDER(input, 0, {});

	var expected = {
		type: "SEQUENCE",
		size: 8,
		value: [
			{
				type: "INTEGER",
				size: 3,
				value: 5
			},
			{
				type: "INTEGER",
				size: 3,
				value: 8
			}
		],
		bytes: "3006020105020108"
	};

	assert.equal(JSON.stringify(result), JSON.stringify(expected), "DER decoding works");
};

exports["test decode length"] = function(assert){
	var input = [0x30, 0x3, 0x3, 0x1, 0x1];

	var length = asn._decodeLength(input, 0);
    var exptected = {
        value: 3,
        additionalBytes: 0
    };

	assert.equal(JSON.stringify(length), JSON.stringify(exptected));
};

exports["test decode boolean false"] = function(assert){
    var input = [0x1, 0x1, 0x0];

    var result = asn.decodeDER(input, 0, {});
    var exptected = {
        type: "BOOLEAN",
        size: 3,
        value: false
    };

    assert.equal(JSON.stringify(result), JSON.stringify(exptected));
};

exports["test decode boolean true"] = function(assert){
    var input = [0x1, 0x1, 0xff];

    var result = asn.decodeDER(input, 0, {});
    var exptected = {
        type: "BOOLEAN",
        size: 3,
        value: true
    };

    assert.equal(JSON.stringify(result), JSON.stringify(exptected));
};

exports["test decode length long"] = function(assert){
	var input = [0x30, 0x82, 0x02, 0xc6];

	var length = asn._decodeLength(input, 0);
    var exptected = {
        value: 710,
        additionalBytes: 2
    };

    assert.equal(JSON.stringify(length), JSON.stringify(exptected));
};

require("sdk/test").run(exports);