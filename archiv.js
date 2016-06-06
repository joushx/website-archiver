/**
 * Module to archive a website and save it to a zip file
 * @module archiv
 * @author Johannes Mittendorfer
 */
var {Cc, Ci, Cu} = require("chrome");
var io = require("sdk/io/file");
var url = require("sdk/url");
var xhr = require("sdk/net/xhr");

var hash = require("hash");
var pkixtsp = require("pkixtsp");
var verify = require("verify");
var error = require("error");

var zipw = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);
var fu = Cu.import('resource://gre/modules/FileUtils.jsm').FileUtils;

/**
 * Archive function
 * @param window {object} A content window DOM window that should be archived
 */

/**
 * Archives a page
 * @param window {object} A content window DOM window that should be archived
 * @param path {string} The path where to save the files
 * @param onSuccess {function} A function called when everything is successful
 */
function archive(window, path, onSuccess) {

	"use strict";

	if(!window){
		error.show("window must be defined");
		throw "window must be defined";
	}

	if(!path){
		error.show("path must be defined");
		throw "path must be defined";
	}

	if(!onSuccess){
		error.show("callback must be defined");
		throw "callback must be defined";
	}

	console.log("extract URLs");

	// extract list of resources from window
	var list = getURLList(window);

  // create temporary path for archiving
  var tmpPath = path + "/archive-tmp-" + new Date().getTime();
	console.log("create temporary folder" + tmpPath);
  io.mkpath(tmpPath + "/content/");

	console.log("download list");

	// download resources to filesystem
	downloadList(list, tmpPath + "/content/", function(files, errors){

    // pack download folder
    zip(tmpPath + "/content/", tmpPath + "/content.zip");

		console.log("hash archive");

    // hash archive
    var hashValue = hash.hashFile(tmpPath + "/content.zip");

    // get signature for hash
    pkixtsp.sign(hashValue, function(response){

			console.log("write manifest");

			// write manifest file
			var manifest = {url: window.document.URL, files: files, signature: response};
			writeManifest(manifest, tmpPath + "/manifest");

			console.log("remove content folder");

			// remove temporary folder
			removeFolder(tmpPath + "/content");

			console.log("pack temporary folder");

			// pack tmp folder
			var domain = window.document.domain;
			var endPath = path + "/" + domain + "-" + new Date().getTime() + ".zip";
			zip(tmpPath, endPath);

			console.log("create " + endPath);

			console.log("remove temporary folder");

			removeFolder(tmpPath);

			onSuccess(manifest);
		});
	});
}

/**
 * Deletes a folder recursively
 * @param path {string} The path of the folder
 */
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

/**
 * Writes the manifest to a file
 * @param manifest {object} Manifest object
 * @param path {string} The path of the file
 */
function writeManifest(manifest, path){
  var stream = io.open(path, "w");
  if (!stream.closed) {
    stream.write(JSON.stringify(manifest, null, 2));
    stream.close();
  }
  else{
    throw "stream is closed";
  }
}

/**
 * Creates a list of the resources that shoud be saved
 * @param window {object} A content window DOM window that should be archived
 */
function getURLList(window){
	"use strict";

	// create list of ressource and init with page URL
	var urlList = [window.location.href];

	// get list of loaded ressources with new performance API
	var resources = window.performance.getEntriesByType("resource");

	// for each ressource extract the url
	resources.forEach(function (resource) {
		urlList.push(resource.name);
	});

	console.log(urlList);

	return urlList;
}

/**
 * Downloads a list of ressources to a given path on the filesystem
 * @param list {string[]} A list of URLs to be archived
 * @param path {string} The path where the file should be saved
 * @param callback {function} A callback function that gets called when finished
 */
function downloadList(list, path, callback){
	"use strict";

	// create empty array for manifest
	var manifest = [];

	// create empty array for requests with errors
	var errors = [];

	var counter = 0;
	for(var i = 0; i < list.length; i++) {

		// parse URL into object
		var address = url.URL(list[i]);

		// construct target path
		var fullPath = "";
		if(address.port === null){	// check if default http ports
			if (address.protocol === "http:"){
				fullPath = path + address.host + address.pathname;
			}
			else if(address.protocol === "https:"){
				fullPath = path + address.host + "_443" + address.pathname;
			}
			else{
				fullPath = path + address.protocol + address.pathname;
			}
		} else {
			fullPath = path + address.host + "_" + address.port + address.pathname;
		}

		download(address, fullPath, onSuccess, onError);
	}

	function onSuccess(manifestObject){
		// add to manifest array
		manifest.push(manifestObject);

		afterRequest();
	}

	function onError(path){
		// add file to list of errors
		errors.push(path);

		afterRequest();
	}

	function afterRequest(){
		counter++;

		if(counter === (list.length)){
			callback(manifest, errors);
		}
	}
}

/**
 * Downloads a single file and saves it to the given path.
 * The content goes into a file "content" and some SSL
 * information go into "ssl".
 * @param url {string} The url of the file
 * @param path {string} The path where to save
 * @callback onSuccess Called when download is a success
 * @callback onError Called when download fails
 */
function download(url, rawPath, onSuccess, onError){
	"use strict";

	console.log("download " + url);

	// check if path is already there and use (2), (3), (4) etc. if so
	var path;
	if(io.exists(rawPath)){

		// try integers
		for(var i = 2; i < Number.POSITIVE_INFINITY; i++){

			// if it does not exist
			if(!io.exists(rawPath + " (" + i + ")")){

				// set path and leave
				path = rawPath + " (" + i + ")";
				break;
			}
		}
	}
	else{

		// nothing special; use default
		path = rawPath;
	}

	// create containing folder
	io.mkpath(path);

	// create path for content
	var contentFilename;
	var parameterFilename;
	if(path.slice(-1) === "/"){
		contentFilename = path + "__content";
		parameterFilename = path + "__parameter";
	}
	else{
		contentFilename = path + "/__content";
		parameterFilename = path + "/__parameter";
	}

	// create empty manifest object for file
	var manifestObject = {};

	let request = new xhr.XMLHttpRequest();

	// onSuccess
	request.addEventListener("load", function(){

		// write content to file
		var contentStream = io.open(contentFilename, "w");
		if (!contentStream.closed) {
			contentStream.write(this.responseText);
			contentStream.close();
		}
		else{
			throw "stream is closed";
		}

		// write parameter to file if present
		if(url.search !== ""){
			var parameterStream = io.open(parameterFilename, "w");
			if (!parameterStream.closed) {
				parameterStream.write(url.search);
				parameterStream.close();
			}
			else{
				throw "stream is closed";
			}
		}

		// create hash and manifest object
		manifestObject = {
			file: contentFilename,
			url: url,
			hash: hash.hashFile(contentFilename)
		};

		// check if SSL
		if(this.channel.securityInfo !== null && this.channel.securityInfo instanceof Ci.nsISSLStatusProvider){

			// get ssl status object
			var ssl = this.channel.securityInfo.QueryInterface(Ci.nsISSLStatusProvider).SSLStatus.QueryInterface(Ci.nsISSLStatus);

			// add to manifest
			manifestObject.certificate = ssl.serverCert;
		}

		console.log("success " + url);
		onSuccess(manifestObject);
	});

	// onError
	request.addEventListener("error", function(){
		console.log("error " + url);
		onError(path);
	});

	request.open("GET", url);

	// bypass cache
	request.setRequestHeader('If-Modified-Since', 'Sat, 1 Jan 2000 00:00:00 GMT');

	request.send();
}

/**
 * Creates a zip archive out of a directory
 * @param directory {string} Directory to be archived
 * @param path {string} Filepath where to save the zip archive
 */
function zip(directory, path){
	"use strict";

	var zipFile = fu.File(path);

	console.log("pack " + directory);

	// Open zip with parameters according to https://developer.mozilla.org/en-US/docs/PR_Open#Parameters
	var pr = {PR_RDONLY: 0x01, PR_WRONLY: 0x02, PR_RDWR: 0x04, PR_CREATE_FILE: 0x08, PR_APPEND: 0x10, PR_TRUNCATE: 0x20, PR_SYNC: 0x40, PR_EXCL: 0x80};
	zipw.open(zipFile, pr.PR_RDWR | pr.PR_CREATE_FILE | pr.PR_TRUNCATE);

  // start recursive adding
	addToZip(fu.File(directory), fu.File(directory), zipw);

	zipw.close();
}

/**
 * Adds a specific file or folder recursively to a zip archive
 * @param base {object} The base directory to relativly add files from
 * @param file {object} The file to add
 * @param zipwriter {object} The zipwriter of the archive
 */
function addToZip(base, file, zipwriter){
	"use strict";

	// get relative path
	let path = file.getRelativeDescriptor(base);

	// fix empty path
	if(path === ""){
		path = "/";
	}

  console.log("add " + file.path);

	if(file.isFile()){

		// add file entry
		zipwriter.addEntryFile(path, Ci.nsIZipWriter.COMPRESSION_DEFAULT, file, false);
	}
	else{

		// maybe add folder entries to support certain zip reader
		//zipwriter.addEntryFile(path, Ci.nsIZipWriter.COMPRESSION_DEFAULT, file, false);

		// enumerate files in folder
		var entries = file.directoryEntries;
		while(entries.hasMoreElements()){
			var f = entries.getNext().QueryInterface(Ci.nsIFile);

			// call itself
			addToZip(base, f, zipwriter);
		}
	}
}

exports.archive = archive;
exports._getURLList = getURLList;
exports._downloadList = downloadList;
exports._zip = zip;
