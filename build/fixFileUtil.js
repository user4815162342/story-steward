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
if (fileUtil && fileUtil.copyFile) {
	
	(function() {
		var oldCopyFile = fileUtil.copyFile;
		fileUtil.copyFile = function(/*String*/srcFileName, /*String*/ destFileName, /*boolean?*/ onlyCopyNew) {
			if (oldCopyFile.call(fileUtil,srcFileName,destFileName,onlyCopyNew)) {
				var oldFileTime = new java.io.File(srcFileName).lastModified();
				java.io.File(destFileName).setLastModified(oldFileTime);
				return true;
			}
			return false;
		}
	})();

}

if (fileUtil) {
    
    fileUtil.concatenateFiles = function(/*Array*/sourceFiles, /*String*/destFileName) {
    
        //summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
        //srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
        var destFile = new java.io.File(destFileName);


        //Make sure destination dir exists.
        var parentDir = destFile.getParentFile();
        if(!parentDir.exists()){
            if(!parentDir.mkdirs()){
                throw "Could not create directory: " + parentDir.getAbsolutePath();
            }
        }

        //Java's version of copy file.
        var destChannel = new java.io.FileOutputStream(destFileName).getChannel();
        for (var i = 0; i < sourceFiles.length; i++) {
            var srcChannel = new java.io.FileInputStream(sourceFiles[i]).getChannel();
            destChannel.transferFrom(srcChannel, 0, srcChannel.size());
            srcChannel.close();
        }
        destChannel.close();
	
        return true; //Boolean
    }
}
