var verifier = require("../verify");
var tabs = require("sdk/tabs");
var {Cc, Ci, Cu} = require("chrome");
var io = require("sdk/io/file");
const { atob } = require("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Services.jsm");
var data = require("sdk/self").data;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

exports["test verfiy ZIP"] = function(assert, done) {
	"use strict";

	// copy to tmp folder
	var file = Services.dirsvc.get("TmpD", Ci.nsIFile);
	file.append("test.zip");
	copyDataURLToFile(data.url("test/testzip.html"), file, function(file, result) {

		// verify copied zip
		verifier.verifyZIP("/tmp/test.zip", function(result){
			assert.ok(result.hashes_match, "Hash matches");
			assert.ok(result.signature_valid, "Signature is valid");
			assert.ok(result.certificate_trusted, "Cert is trusted");

			done();
		});

	});
};

exports["test verify signature as hex"] = function(assert, done) {
	"use strict";

	var signature = "6fa8d78e06786c3d86237eec04d8943061b66a97b5baa7a7ff53a32e383bec7c4424fd02cd66ac7ffc44e16d4ca35b41050064282cffd16bfdac8f3029f170f914fe8d6d730df02e5f1b23efee065b01bb67e978a56665e4667a31f4c5b32f15584d4803e585380cb48245f3d424a8e2d42dc1077835f8a87656d54e6b2405049bb64738b5ee16fc5dba69f54cdce4002e12908ac22d0b5867357773000e787c7fc0501e5aa496255d50ad1bb1af7a61fa06da61f8d75bafae417b89eac9affbc759dcee014944703a126f39e83fee50cb0f8722dd7d21850f60a477bcfcaefc8d4a540b09539f25e9efcf83e8cfee5634d0720b1f75095160f3de2507ce69bb";
	var data = "31818c301a06092a864886f70d010903310d060b2a864886f70d0109100104301c06092a864886f70d010905310f170d3136303431343038303130375a302306092a864886f70d01090431160414f3417ec5b5f0bda776bbe7551c329ca0987af64b302b060b2a864886f70d010910020c311c301a30183016041443671ce7e61beec089528ed1f20a2c3c92cd40a2";
	var key = "30820122300d06092a864886f70d01010105000382010f003082010a0282010100a9ac33b296da7177999d464f47aa4a40d57d58dcfd93beae68913ab75cb77fe36c4b52b3b55a53cce10f70880a81aba4ffdc1d4826fe645cbabcd1e0b4eceff702f6fb378670128eadbe39a4a9e484c1d01f95fcfcbd44ca091dcc344e0356ca8967f54f7f6acc0dd5af8c1a4f77003fe01c3b98d6611d52b3fe432962544e142cc6f99163ccb7798bb8d4aea948d0cd6f72b740915b87ca2824ac9ec958ab0e5eacb36a7a66be091e826f862849026aa911e3b1a84487f6654aad7f3be4d1d9d312b2f9fcd7c69836ae893060393a47b310a6a4b03eeea6c8659df57782fa75855007d5ffb622ff8d229edd57c0771149b7fc827780fcde0c02f82bc2977d250203010001";
	var algorithm = "1.3.14.3.2.26";

	verifier.verifySignature(signature, data, key, algorithm, function(result){
		assert.ok(result, "Correct signature verified");
		done();
	});
};

function _base64ToArrayBuffer(base64) {
	var binary_string =  atob(base64);
	var len = binary_string.length;
	var bytes = new Uint8Array( len );
	for (var i = 0; i < len; i++)        {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}

function copyDataURLToFile(url, file, callback) {
	NetUtil.asyncFetch(url, function(istream) {
		var ostream = Cc["@mozilla.org/network/file-output-stream;1"].
		createInstance(Ci.nsIFileOutputStream);
		ostream.init(file, -1, -1, Ci.nsIFileOutputStream.DEFER_OPEN);
		NetUtil.asyncCopy(istream, ostream, function(result) {
			callback && callback(file, result);
		});
	});
}

require("sdk/test").run(exports);
