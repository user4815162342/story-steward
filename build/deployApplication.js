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
load(buildScriptsPath + "jslib/fileUtil.js");
load(scriptPath + "fixFileUtil.js");
load(buildScriptsPath + "jslib/logger.js");
load(scriptPath + "fileIterator.js");
load(scriptPath + "info.js");

function CreatePackage(files, path) {
    logger.info("Creating Package: " + path);
    var zipstream = new java.util.zip.ZipOutputStream(new java.io.FileOutputStream(new java.io.File(path)));
    var zipchannel = java.nio.channels.Channels.newChannel(zipstream);
    try {
        var file;
        while (item = files.getCurrent()) {
            logger.info("  Compressing: " + item.entry);
            var sourcestream = new java.io.FileInputStream(item.file);
            var sourcechannel = sourcestream.getChannel();
            try {
                var entry = new java.util.zip.ZipEntry(item.entry);
                entry.setTime(item.file.lastModified());
                zipstream.putNextEntry(entry);
                sourcechannel.transferTo(0, sourcechannel.size(), zipchannel);
            } finally {
                sourcechannel.close();
            }
            files.next();
        }
    } finally {
        zipchannel.close();
    }
}

var filename = AppInfo.Name + "-" + AppInfo.Version.Major + "." + AppInfo.Version.Minor + "." + AppInfo.Version.Revision;

if (isDevTarget) {
    var base = scriptPath + "../development/";
    var list = RecursiveFileIterator(base, null, true, false);
    CreatePackage(list, scriptPath + "../deploy/" + filename + "-dev.zip");
    
}
if (isRelTarget) {
    var base = scriptPath + "../release/";
    var list = RecursiveFileIterator(base, null, true, false);
    CreatePackage(list, scriptPath + "../deploy/" + filename + ".zip");
}
logger.info("Packages Created.");

if (isRelTarget) {
	var compiler = "C:/Program Files/Inno Setup 5/ISCC.exe"
	var compilerFile = new java.io.File(compiler);
	if (compilerFile.exists()) {
		logger.info("Building windows installer using Inno Setup (with Preprocesser)");
		// RunProcess should already have been loaded in the info.js
		var version = AppInfo.Version.Major + "." + AppInfo.Version.Minor;
	    RunProcess([compiler, "/dMyAppVersion=" + version, "/F" + filename + "-windows", "build-windows-deploy.iss"], scriptPath);

	} else {
		logger.info("Inno Setup is unavailable, windows installer will not be built.")
	}
	
}
