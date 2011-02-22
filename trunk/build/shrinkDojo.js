/*
 * Copyright 2011 Neil M. Sheldon

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
load(buildScriptsPath + "jslib/logger.js");
load(scriptPath + "fileIterator.js");
load(scriptPath + "dojo-profile.js");

function shrinkDojo(target) {
    var dojodir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dojo/");
    var resourcesdir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dojo/resources/");
    var dojo = RecursiveFileIterator(dojodir, function(file) {
        var name = file.getName();
        if (dojodir.equals(file.getParentFile())) {
            return (name != "build.txt") &&
            (name != "dojo.js") &&
            (name != "LICENSE") &&
            (name != "my-dojo.js");
        }
        if (resourcesdir.equals(file.getParentFile())) {
            return (name != "dojo.css") && (name.endsWith(".js") || name.endsWith(".css"));
        }
        if ((file.getParentFile().getName() == "nls") || (file.getParentFile().getParentFile().getName() == "nls")) {
            // do not delete any localization files.
            return false;
        }
        
        return name.endsWith(".js") || name.endsWith(".css");
    }, true, true);
    
    var dijitdir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dijit/");
    var themesdir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dijit/themes/");
    var tundradir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dijit/themes/tundra");
    var dijit = RecursiveFileIterator(dijitdir, function(file) {
        var name = file.getName();
        if (dijitdir.equals(file.getParentFile())) {
            return name != "LICENSE";
        }
        if (themesdir.equals(file.getParentFile())) {
            return (name != "dijit.css") && (name != "dijit_rtl.css");
        }
        if (tundradir.equals(file.getParentFile())) {
            return (name != "tundra.css") && (name != "tundra_rtl.css");
        }
        if ((file.getParentFile().getName() == "nls") || (file.getParentFile().getParentFile().getName() == "nls")) {
            // do not delete any localization files.
            return false;
        }
        return name.endsWith(".js") || name.endsWith(".css");
    }, true, true)
    
    var file;
    while (item = dojo.getCurrent()) {
        logger.info("Deleting dojo/" + item.entry);
        fileUtil.deleteFile(item.file);
        dojo.next();
    }
    while (item = dijit.getCurrent()) {
        logger.info("Deleting dijit/" + item.entry);
        fileUtil.deleteFile(item.file);
        dijit.next();
    }
    logger.info("Deleting dijit/themes/claro/");
    fileUtil.deleteFile(scriptPath + "../" + target + "/js/dojo/dijit/themes/claro/")
    logger.info("Deleting dijit/themes/soria/");
    fileUtil.deleteFile(scriptPath + "../" + target + "/js/dojo/dijit/themes/soria/")
    logger.info("Deleting dijit/themes/nihilo/");
    fileUtil.deleteFile(scriptPath + "../" + target + "/js/dojo/dijit/themes/nihilo/")
    
    
	// Clear out all dojox folders which aren't required. I wish I could do
	// something similar for the others, but their directory structures aren't
	// quite as expected...
    var requireddojoxdirs = ["LICENSE"];
    for (var i = 0; i < dependencies.layers.length; i++) {
        for (var j = 0; j < dependencies.layers[i].dependencies.length; j++) {
            if (dependencies.layers[i].dependencies[j].indexOf("dojox.") == 0) {
                var depdir = dependencies.layers[i].dependencies[j].substring("dojox.".length);
                depdir = depdir.substring(0, depdir.indexOf("."));
                requireddojoxdirs.push(depdir);
                requireddojoxdirs.push(depdir + ".js");
                
            }
        }
    }
    
    var dojoxdir = new java.io.File(scriptPath + "../" + target + "/js/dojo/dojox/");
    var dojoxdirs = dojoxdir.listFiles();
    for (var i = 0; i < dojoxdirs.length; i++) {
        var name = "" + dojoxdirs[i].getName();
        if (requireddojoxdirs.indexOf(name) == -1) {
            logger.info("Deleting dojox/" + name);
            fileUtil.deleteFile(dojoxdirs[i].getCanonicalPath());
        }
    }
    
    var dojox = RecursiveFileIterator(dojoxdir, function(file) {
        // TODO: What else can we get rid of here? There are
        // certainly some theme files that we don't need, but I'm not
        // sure if the nameing conventions are accurate.
        var name = file.getName();
        if ((file.getParentFile().getName() == "nls") || (file.getParentFile().getParentFile().getName() == "nls")) {
            // do not delete any localization files.
            return false;
        }
        return name.endsWith(".js");
    }, true, true)
    
    
    
    while (item = dojox.getCurrent()) {
        logger.info("Deleting dojox/" + item.entry);
        fileUtil.deleteFile(item.file);
        dojox.next();
    }
    logger.info("Dojo shrunken for " + target + ".");
	
}
if (isDevTarget) {
	shrinkDojo("development");
}
if (isRelTarget) {
	shrinkDojo("release");
}

