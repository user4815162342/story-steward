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
function RecursiveFileIterator(startDir, checkCallback, makeUnixPaths, startDirIsJavaObject, prefix) {

    prefix = prefix || "";
	
    var topDir = startDir;
    if (!startDirIsJavaObject) {
        topDir = new java.io.File(startDir);
    }
    
    if (topDir.exists()) {
        var dirFileArray = topDir.listFiles();
        var i = 0;
        var current = null;
        
        var result = {
            getCurrent: function() {
                if (current && current.getCurrent) {
                    return current.getCurrent();
                }
                return current;
            },
            
            next: function() {
                if (current && current.next) {
                    current.next();
                    if (current.getCurrent()) {
                        return;
                    }
                }
                current = null;
                while ((i < dirFileArray.length) && (current == null)) {
                    var file = dirFileArray[i];
                    if (file.isFile()) {
                        var filePath = file.getPath();
                        if (makeUnixPaths) {
                            //Make sure we have a JS string.
                            filePath = String(filePath);
                            if (filePath.indexOf("/") == -1) {
                                filePath = filePath.replace(/\\/g, "/");
                            }
                        }
                        
                        var ok = true;
                        if (checkCallback) {
                            ok = checkCallback(file, filePath);
                        }
                        
                        if (ok && !file.getName().match(/^\./)) {
                            current = {
                                file: file,
                                entry: prefix + file.getName()
                            }
                            
                        }
                    } else if (file.isDirectory() && !file.getName().match(/^\./)) {
                        current = RecursiveFileIterator(file, checkCallback, makeUnixPaths, true, prefix + file.getName() + "/");
                        if (!current.getCurrent()) {
                            current = null;
                        }
                    }
                    i++;
                }
            }
        }
        result.next();
        return result;
        
    }
    return {
    
        getCurrent: function() {
            return null;
        },
        
        next: function() {
        }
        
        
    }
    
}

