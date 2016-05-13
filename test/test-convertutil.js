var cutil = require("convertutil");


exports["test array to hex"] = function(assert) {
	"use strict";

	var input = [0xff, 0x1, 0x2, 0x3, 0x00];
	var expected = "ff01020300";

	var actual = cutil.arrayToHex(input);

	assert.equal(expected, actual, "Array to hex works");
};

require("sdk/test").run(exports);
