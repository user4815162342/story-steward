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

// TODO: The following link adds some stuff to the build process which might help:
// http://asmodehn.wordpress.com/2011/09/07/dojo-toolkit-slim-build/
var scriptPath = arguments[0];
if (scriptPath.indexOf("/") == -1) {
    scriptPath = scriptPath.replace(/\\/g, "/");
}

var isDevTarget = arguments[1] == 1;
var isRelTarget = arguments[2] == 1;

buildScriptsPath = typeof buildScriptsPath == "undefined" ? scriptPath + "../vendor/dojo/util/buildscripts/" : buildScriptsPath;
load(buildScriptsPath + "jslib/logger.js");
load(scriptPath + "runprocess.js");


var jarPath = "../shrinksafe/";
var classPath = jarPath + "js.jar;" + jarPath + "shrinksafe.jar";



if (isDevTarget || isRelTarget) {
    // FUTURE: Pre-build, perhaps go through source and find dojo.requires and build 
    // my own profile file.
}


/*
 * NOTE: Yes, I'm aware of rhino's runCommand. The problem is that that function does
 * not support setting the working directory. What I've done here to support these things
 * appears to be quite simple, and it works.
 * The working directory thing is necessary because the dojo build scripts use relative
 * paths, and don't offer an easy option to avoid this.
 */
if (isDevTarget) {
    logger.info("Building dojo for development");
    RunProcess(["java", "-classpath", classPath, "org.mozilla.javascript.tools.shell.Main", "build.js", "optimize=comments", "layerOptimize=comments", "cssOptimize=comments.keepLines", "mini=true", "profileFile=../../../../build/dojo-profile.js", "action=clean,release", "releaseDir=../../../../development/js"], buildScriptsPath)
}
if (isRelTarget) {
    logger.info("Building dojo for release");
    RunProcess(["java", "-classpath", classPath, "org.mozilla.javascript.tools.shell.Main", "build.js", "optimize=shrinksafe", "copyTests=false", "layerOptimize=shrinksafe", "cssOptimize=comments", "mini=true", "stripConsole=warn", "profileFile=../../../../build/dojo-profile.js", "action=clean,release", "releaseDir=../../../../release/js"], buildScriptsPath);
}
logger.info("Dojo built.")

