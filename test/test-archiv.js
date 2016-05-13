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

/**
 * Check if the downloadList function downloads all given ressources
 * @param assert
 * @param done
 */
exports["test downloadList"] = function(assert, done) {
	"use strict";

	var list = [
		data.url("test/simple.html"),
		data.url("test/a"),
		data.url("text/b/c")
	];

	io.mkpath("/tmp/archive-download/");

	archiver._downloadList(list, "/tmp/archive-download/", function(manifest, errors){

		// check if all files are there
		assert.ok(io.exists("/tmp/archive-download/simple.html"), "simple.html");
		assert.ok(io.exists("/tmp/archive-download/a"), "a");
		assert.ok(io.exists("/tmp/archive-download/b/c"), "c");

		// check if number of files is as expected
		assert.equal(2, io.list("/tmp/archive-download/").length, "file count");

		/*checkContent(assert, "/home/johannes/Schreibtisch/tmp/test.johannes-mittendorfer.com_443/bachelor/a/b/c.txt", "Hello World!\n");
		checkContent(assert, "/home/johannes/Schreibtisch/tmp/test.johannes-mittendorfer.com/bachelor/a/b/c.txt", "Hello World!\n");*/

		done();
	});
};

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

	archiver._zip("/home/johannes/Schreibtisch/tmp/", "/home/johannes/Schreibtisch/tmp.zip");

	assert.ok(io.exists("/home/johannes/Schreibtisch/tmp.zip"), "zip exists");
};

exports["test archive simple.html"] = function(assert, done){
	"use strict";

	// open url
	tabs.open({
		url: data.url("test/simple.html"),
		onOpen: function(tab) {
			tab.on("ready",function(){

				// run function
				var window = require("sdk/window/utils").getMostRecentBrowserWindow().content;
				archiver.archive(window, "/tmp/", function(){

					// clean up
					tab.close(function(){
						done();
					});
				});
			});
		}
	});
};

require("sdk/test").run(exports);
