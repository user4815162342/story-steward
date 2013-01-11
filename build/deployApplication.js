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
require("dojo", "fileUtil");
require("my", "fixFileUtil");
require("dojo", "logger");
require("my", "fileIterator");
require("my", "info");

(function() {
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
    
    if (params.targets.development) {
        var base = params.scriptPath + "../development/";
        var list = RecursiveFileIterator(base, null, true, false);
        CreatePackage(list, params.scriptPath + "../deploy/" + filename + "-dev.zip");
        
    }
    if (params.targets.release) {
        var base = params.scriptPath + "../release/";
        var list = RecursiveFileIterator(base, null, true, false);
        CreatePackage(list, params.scriptPath + "../deploy/" + filename + ".zip");
    }
    logger.info("Packages Created.");
    
    if (params.targets.release) {
        
        // Create the 'nw' package, which is just copying stuff.
        logger.info("Creating the node-webkit package");
        fileUtil.copyFile(params.scriptPath + "../deploy/" + filename + ".zip", params.scriptPath + "../deploy/" + filename + ".nw");
        
        // Create the nw folders for linux
        // TODO: Still need to create .deb packages.
        // FUTURE: At some point, node-webkit says it may come out with scripts to quickly build these packages, maybe I should
        // wait for that before creating a package.
        logger.info("Creating Story Steward Binary Distribution for Linux 32-bit.");
        fileUtil.copyDir(params.scriptPath + "../vendor/node-webkit/node-webkit-linux-ia32", params.scriptPath + "../tmp/" + filename + "-linux-32bit",/^.*$/g,true);
        RunProcess(["chmod","+x",params.scriptPath + "../tmp/" + filename + "-linux-32bit/nw"],params.scriptPath);
        fileUtil.copyFile(params.scriptPath + "../deploy/" + filename + ".nw",params.scriptPath + "../tmp/" + filename + "-linux-32bit/story-steward.nw");
        var bashScript = '#!/bin/bash\nnw "$(dirname "$(readlink -f "$0")")"/story-steward.nw\n';
        fileUtil.saveFile(params.scriptPath + "../tmp/" + filename + "-linux-32bit/story-steward", bashScript);
        RunProcess(["chmod","+x",params.scriptPath + "../tmp/" + filename + "-linux-32bit/story-steward"],params.scriptPath);
        logger.info("Creating Tar...");
        RunProcess(["tar","-cvzf","../deploy/" + filename + "-linux-32bit.tar.gz","-C","../tmp",filename + "-linux-32bit/"],params.scriptPath);
        
        logger.info("Creating Story Steward Binary Distribution for Linux 64-bit.");
        fileUtil.copyDir(params.scriptPath + "../vendor/node-webkit/node-webkit-linux-x64", params.scriptPath + "../tmp/" + filename + "-linux-64bit",/^.*$/g,true);
        RunProcess(["chmod","+x",params.scriptPath + "../tmp/" + filename + "-linux-64bit/nw"],params.scriptPath);
        fileUtil.copyFile(params.scriptPath + "../deploy/" + filename + ".nw",params.scriptPath + "../tmp/" + filename + "-linux-64bit/story-steward.nw");
        //var bashScript = '#!/bin/bash\nnw "$(dirname "$(readlink -f "$0")")"/story-steward.nw\n';
        fileUtil.saveFile(params.scriptPath + "../tmp/" + filename + "-linux-64bit/story-steward", bashScript);
        RunProcess(["chmod","+x",params.scriptPath + "../tmp/" + filename + "-linux-64bit/story-steward"],params.scriptPath);
        // package the story steward binary for linux.
        logger.info("Creating Tar...");
        RunProcess(["tar","-cvzf","../deploy/" + filename + "-linux-64bit.tar.gz","-C","../tmp",filename + "-linux-64bit/"],params.scriptPath);
        
        
        logger.info("Creating Story Steward Binary Distribution for Windows 32-bit.");
        fileUtil.copyDir(params.scriptPath + "../vendor/node-webkit/node-webkit-win-ia32", params.scriptPath + "../tmp/" + filename + "-win",/^.*$/g,true);
        fileUtil.copyFile(params.scriptPath + "../deploy/" + filename + ".nw",params.scriptPath + "../tmp/" + filename + "-win/story-steward.nw");
        var batchFile = '%~dp0\\nw %~dp0\\story-steward.nw';
        fileUtil.saveFile(params.scriptPath + "../tmp/" + filename + "-win/story-steward.bat", batchFile);
        logger.info("Creating Zip");
        // Need to delete the old one, since the default action is to update and add, and I see no option to delete.
        // NOTE: I'm not using the CreatePackage above, since I want the actual folder to appear in it. The others
        // should probably do that too, but I'm waiting until I port this over to node to handle that.
        fileUtil.deleteFile(params.scriptPath + "../deploy/" + filename + "-win.zip");
        RunProcess(["zip","-r","../deploy/" + filename + "-win.zip", filename + "-win"],params.scriptPath + "../tmp");
        
        // TODO: Need to test and work on the Windows deploy:
        // 1. Download from Hyperborea into Windows and see if it will run.
        // 2. If it does, try concatenating the files in Windows and see if it will run.
        // 3. If it does, try adding a concatenation task to the above to build the file and see if that will run in Windows.
        // 4. If it does, then that's our package, not the other one.
        // 5. See if we can get wine on this machine to run ISCC.exe below, and then rework the
        //    script to install the node-webkit version.
        
        
        
        // Create Windows Package (currently using Prism build)
        // TODO: Could make use of Wine to run this.
        var compiler = "C:/Program Files/Inno Setup 5/ISCC.exe"
        var compilerFile = new java.io.File(compiler);
        if (compilerFile.exists()) {
            logger.info("Building windows installer using Inno Setup (with Preprocesser)");
            // RunProcess should already have been loaded in the info.js
            var version = AppInfo.Version.Major + "." + AppInfo.Version.Minor;
            RunProcess([compiler, "/dMyAppVersion=" + version, "/F" + filename + "-windows", "build-windows-deploy.iss"], params.scriptPath, printer);
            
        } else {
            logger.info("Inno Setup is unavailable, windows installer will not be built.")
        }
        
    }
})();
