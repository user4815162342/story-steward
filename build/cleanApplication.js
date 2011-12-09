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

require("dojo","fileUtil");
require("my","fixFileUtil");
require("dojo","logger");

function cleanOutputDir(path) {
    var file = new java.io.File(path);
    if (file.exists() && file.isDirectory()) {
        var files = file.listFiles();
        for (var i = 0; i < files.length; i++) {
            if (files[i].getName() == "js") {
                var jsfiles = files[i].listFiles();
                for (var j = 0; j < jsfiles.length; j++) {
                    if (jsfiles[j].getName() != "dojo") {
                        fileUtil.deleteFile(jsfiles[j]);
                        
                    }
                }
            } else {
                fileUtil.deleteFile(files[i]);
            }
        }
    } else {
        throw "Output file is not a directory."
    }
}

if (params.targets.development) {
    logger.info("Cleaning development");
    cleanOutputDir(params.scriptPath + "../development/");
}
if (params.targets.release) {
    logger.info("Cleaning release");
    cleanOutputDir(params.scriptPath + "../release/");
}
logger.info("Cleaned.");
