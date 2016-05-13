var archiver = require("../archiv");
var tabs = require("sdk/tabs");
var {Cc,Ci} = require("chrome");
var io = require("sdk/io/file");
var data = require("sdk/self").data;

/**
 * Check if getURLList function can extract all links from a given page
 * @param assert
 * @param done
 */
exports["test getURLList simple.html"] = function(assert, done) {
	"use strict";

	// open url
	tabs.open({
		url: data.url("test/simple.html"),
		onOpen: function(tab) {
			tab.on("ready",function(){

				// run function
				var window = require("sdk/window/utils").getMostRecentBrowserWindow().content;
				var links = archiver._getURLList(window);

				// check
				assert.equal(7, links.length, "URL count");
				assert.ok(links.indexOf(data.url("test/yes.css") !== -1, "CSS"));
				assert.ok(links.indexOf(data.url("test/yes.js") !== -1, "JavaScript"));
				assert.ok(links.indexOf(data.url("test/yes.jpg") !== -1, "Image"));
				assert.ok(links.indexOf(data.url("test/yes.mp4") !== -1, "Video"));
				assert.ok(links.indexOf(data.url("test/yes.mp3") !== -1, "Audio"));
				assert.ok(links.indexOf(data.url("test/yes.html") !== -1, "Frame"));

				// clean up
				tab.close(function(){
					done();
				});
			});
		}
	});
};


exports["test downloadList"] = function(assert, done) {
	"use strict";

	var list = [
		data.url("test/yes.js"),
		data.url("test/simple.html"),
		data.url("test/a"),
		data.url("test/b/c")
	];

	io.mkpath("/tmp/archive-download/");

	archiver._downloadList(list, "/tmp/archive-download/", function(manifest, errors){

		// check if all files are there
		assert.ok(io.exists("/tmp/archive-download/resource:/data/test/simple.html/"), "simple.html");
		assert.ok(io.exists("/tmp/archive-download/resource:/data/test/yes.js/"), "yes.js");
		assert.ok(io.exists("/tmp/archive-download/resource:/data/test/a/"), "a");
		assert.ok(io.exists("/tmp/archive-download/resource:/data/test/b/c/"), "c");

		// check if number of files is as expected
		assert.equal(4, io.list("/tmp/archive-download/resource:/data/test/").length, "file count");

		checkContent(assert, "/tmp/archive-download/resource:/data/test/yes.js/__content", "abc", "content of ");
		checkContent(assert, "/tmp/archive-download/resource:/data/test/a/__content", "Content of a");
		checkContent(assert, "/tmp/archive-download/resource:/data/test/b/c/__content", "Content of c");

		removeFolder("/tmp/archive-download/");

		done();
	});

};

function removeFolder(path){

	// get list of files
	var files = io.list(path);

	// iterate through files
	files.forEach(function(item, index, array){

		// check if file or folder
		if(io.isFile(path + "/" + item)){

			// delete
			io.remove(path + "/" + item);
		}
		else{

			// call recursive
			removeFolder(path + "/" + item);
		}
	});

	// Delete empty directory
	io.rmdir(path);
}

function checkContent(assert, path, expected){
	"use strict";

	var stream = io.open(path,"r");

	if (!stream.closed) {
		var content = stream.read();
		stream.close();
		assert.equal(expected, content, "content of" + path);
	}
	else{
			assert.ok(false, "Stream is closed");
	}
}

exports["test zip"] = function(assert){
	"use strict";

	// create directory
	io.mkpath("/tmp/zip-test");

	// create first file with content
	var path = "/tmp/zip-test/1";
	var stream = io.open(path, "w");
	if (!stream.closed) {
		stream.write("Content of 1");
		stream.close();
	}

	// create first file with content
	var path2 = "/tmp/zip-test/2";
	var stream2 = io.open(path, "w");
	if (!stream2.closed) {
		stream2.write("Content of 2");
		stream2.close();
	}

	archiver._zip("/tmp/zip-test", "/tmp/zip-test.zip");

	removeFolder("/tmp/zip-test");

	assert.ok(io.exists("/tmp/zip-test.zip"), "zip exists");

	io.remove("/tmp/zip-test.zip");
};

require("sdk/test").run(exports);
