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
require("dojo", "fileUtil");
require("my", "fixFileUtil")
require("dojo", "logger");
require("my", "fileIterator");

(function() {
    // NOTE: Change these to add more possible locales
    var nlsMatch = /_(?:en|en-us|en-gb)\.js$/
    var includeLocales = ["en", "en-us", "en-gb"];
    
    function deleteAllBut(base, path, keepFiles, removeFiles, dryRun) {
        var list = (new java.io.File(base + path)).listFiles();
        for (var i = 0; i < list.length; i++) {
            var name = list[i].getName();
            if (!keepFiles || !keepFiles.test(name)) {
                if ((!removeFiles) || (removeFiles.test(name))) {
                    logger.info("Deleting " + path + name);
                    if (!dryRun) {
                        fileUtil.deleteFile(list[i].getAbsolutePath());
                    }
                }
                
            }
        }
        
    }
    
    function shrinkDojo(target) {
        load(params.scriptPath + "dojo-profile-" + target + ".js");
        var dojopath = params.scriptPath + "../" + target + "/js/dojo/";
        var nlsKeep = /^(?:.*_en\.js|.*_en-gb\.js|.*_en-us\.js|en|en-gb|en-us)$/;
        
        deleteAllBut(dojopath, "dojo/", /^(?:dojo\.js|dojo-core\.js|storysteward\.js|dijit\.js|dojox\.js|LICENSE|build\.txt|resources|nls)$/);
        deleteAllBut(dojopath, "dojo/resources/", /^(?:dojo\.css|LICENSE)$/, /\.(?:js|css)$/);
        deleteAllBut(dojopath, "dojo/nls/", nlsKeep);
        
        deleteAllBut(dojopath, "dijit/", /^(?:LICENSE|themes|icons)$/);
        deleteAllBut(dojopath, "dijit/themes/", /^(?:dijit\.css|a11y|tundra)$/);
        deleteAllBut(dojopath, "dijit/themes/tundra/", /^(?:tundra.css|images)$/);
        deleteAllBut(dojopath, "dijit/icons", /^images$/);
        
        // Clear out all dojox folders which aren't required. I wish I could do
        // something similar for the others, but their directory structures aren't
        // quite as expected...
        // the stuff in gfx is loaded dynamically depending on the browser, so it
        // can't be built into everything.
        var requireddojoxdirs = ["LICENSE", "gfx"];
        for (var i = 0; i < dependencies.layers.length; i++) {
            for (var j = 0; j < dependencies.layers[i].dependencies.length; j++) {
                if (dependencies.layers[i].dependencies[j].indexOf("dojox.") == 0) {
                    var depdir = dependencies.layers[i].dependencies[j].substring("dojox.".length);
                    depdir = depdir.substring(0, depdir.indexOf("."));
                    // NOTE: I don't *really* need anything here:
                    // Add to this if more dependencies are added which we don't need.
                    if ((depdir != "json") && (depdir != "charting")) {
                        requireddojoxdirs.push(depdir);
                    }
                    requireddojoxdirs.push(depdir + ".js");
                    
                }
            }
        }
        // don't really need any of this:
        var requiredRegExp = new RegExp("^(?:" + requireddojoxdirs.join("|") + ")$");
        deleteAllBut(dojopath, "dojox/", requiredRegExp);
        
        // When I know about other required dojox stuff, add it in here...
        
        deleteAllBut(dojopath, "dojox/grid/", /^(?:resources)$/)
        deleteAllBut(dojopath, "dojox/grid/resources/", /^(?:images|Grid.css|tundraGrid.css)$/)
        
        if (target == "release") {
            logger.info("deleting my components");
            fileUtil.deleteFile(dojopath + "my");
        }
        
        logger.info("Dojo shrunken for " + target + ".");
        
    }
    
    //if (params.targets.development) {
    //    shrinkDojo("development");
    //}
    if (params.targets.release) {
		logger.info("Shrinking dojo for release");
        shrinkDojo("release");
    }
    
})();
