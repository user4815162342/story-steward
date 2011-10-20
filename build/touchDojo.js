/*
   Copyright 2011 Neil M. Sheldon

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.


 */

var scriptPath = arguments[0];
if (scriptPath.indexOf("/") == -1) {
    scriptPath = scriptPath.replace(/\\/g, "/");
}

var isDevTarget = arguments[1] == 1;
var isRelTarget = arguments[2] == 1;

buildScriptsPath = typeof buildScriptsPath == "undefined" ? scriptPath + "../vendor/dojo/util/buildscripts/" : buildScriptsPath;
load(buildScriptsPath + "jslib/logger.js");
load(scriptPath + "runprocess.js");


/* First, figure out what OS this is on */
var os = java.lang.System.getProperty("os.name");
var postBuildScript = ""
var rsyncPathBase = scriptPath.substring(0,scriptPath.lastIndexOf("/",scriptPath.length - 2));

if (os.indexOf("Win") >= 0) {
	// windows
	postBuildScript = "rsyncDojo.bat"
	if (rsyncPathBase.indexOf(":") == 1) {
		rsyncPathBase = "/cygdrive/" + rsyncPathBase.substring(0,1).toLowerCase() + rsyncPathBase.substring(2);
	}
} else {
	// mac: if (os.indexOf( "mac" ) >= 0);
	// *nix: if  (os.indexOf( "nix") >=0 || os.indexOf( "nux") >=0)
    // although I suspect rsync will be in the path on either one.
 	throw "Build script not ready for this operating system (" + os + ") yet."
}

if (isDevTarget) {
    logger.info("Touching dojo for development");
	RunProcess([postBuildScript, rsyncPathBase + "/vendor/dojo/", rsyncPathBase + "/development/js/dojo/"],scriptPath)
}
if (isRelTarget) {
    logger.info("Touching dojo for release");
	RunProcess([postBuildScript, rsyncPathBase + "/vendor/dojo/", rsyncPathBase + "/release/js/dojo/"],scriptPath)
}
logger.info("Dojo built.")

