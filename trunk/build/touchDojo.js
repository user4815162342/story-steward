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
require("dojo", "logger");

(function() {
    var sourcePath = params.scriptPath + "../vendor/dojo/";
    
    var excludeFiles = /(?:dijit\/themes\/tundra\/tundra\.css|dojo\/dojo\.js|dojo\/dijit\.js|dojo\/dojox\.js|dojo\/dojo-core\.js|dojo\/storysteward\.js)$/
    
    var synchronizeTimestamps = function(source, dest, path, dirsAreJavaObjects) {
    
    
        if (!dirsAreJavaObjects) {
            source = new java.io.File(source);
            dest = new java.io.File(dest);
        }
        path = path || "";
        
        if (source.getName().match(/^\./)) {
            return;
        }
        
        if (path && path.match(excludeFiles)) {
            logger.info("Skipping " + path);
            return;
        }
        
        if (source.exists() && dest.exists()) {
            if (source.isDirectory() && !source.getName().match(/^\./)) {
                if (dest.isDirectory() && !source.getName().match(/^\./)) {
                    var files = source.listFiles();
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        var name = file.getName();
                        synchronizeTimestamps(file, new java.io.File(dest, name), path + "/" + name, true);
                    }
                }
            } else if (!dest.isDirectory()) {
                //			logger.info("Synchronizing " + path);
                dest.setLastModified(source.lastModified());
            }
        }
        
    }
    
    
    if (params.targets.development) {
        logger.info("Touching dojo for development...");
        synchronizeTimestamps(sourcePath, params.scriptPath + "../development/js/dojo/");
    }
    if (params.targets.release) {
        logger.info("Touching dojo for release...");
        synchronizeTimestamps(sourcePath, params.scriptPath + "../release/js/dojo/");
    }
    logger.info("Dojo touched.")
    
})();
