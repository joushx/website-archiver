var hash = require("../hash");
var io = require("sdk/io/file");
var util = require("test/util");
var cutil = require("../convertutil");

exports["test hash file"] = function(assert) {

	var path = "/tmp/x.txt";

	var stream = io.open(path, "w");

	if (!stream.closed) {
		stream.write("Fooobaaaar!");
		stream.close();
	}

	var result = hash.hashFile(path);
	assert.equal(cutil.hexToString("a934a82c44974fe68c0803c7d20a8c67027aa5a36e3c94eda9ba4b2def02ce11"), result, "SHA-256 hash matches");
};

require("sdk/test").run(exports);
