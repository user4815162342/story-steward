/*
 NOTE: The code for this was converted to Dojo from
 the jQuery twFile plugin found at: http://jquery.tiddlywiki.org/twFile.html
 Copyright (c) UnaMesa Association 2009
 Used under the MIT license: http://www.opensource.org/licenses/mit-license.php
 Everything else in this document is
 Copyright (c) Neil M. Sheldon 2011.
 
 Changes I've made:
 1) Convert to use with dojo.
 2) Modify error processing: errors are wrapped and thrown, so that
 they can be more easily differentiated from empty or missing file.
 3) Fall back to a manual copy of content if no copyFile is available on
 the driver.
 4) Added copyfile to mozilla driver.
 5) Fixed false positive for availability of tiddlysaver applet.
 6) Added drivers for nodejs (for use in node-webkit) and requestFileSystem (for use in general modern webkit browsers)
 
 I've marked the code that has changed in a way that will make it easier to see
 with a diff program:
 //- is at the beginning of removed lines
 //+ is at the end of added lines.
 */
dojo.provide("my.LocalFileAccess");
dojo.getObject("my.LocalFileAccess", true);

//- (function($) {
(function() { //+
    //-	if(!$.twFile) {
    //-		$.twFile = {};
    //-	}
    
    //-	$.extend($.twFile,{
    dojo.mixin(my.LocalFileAccess, { //+
        currentDriver: null,
        driverList: ["node", "activeX", "mozilla", "requestFileSystem", "tiddlySaver", "javaLiveConnect"],
        
        // Loads the contents of a text file from the local file system
        // filePath is the path to the file in these formats:
        //    x:\path\path\path\filename - PC local file
        //    \\server\share\path\path\path\filename - PC network file
        //    /path/path/path/filename - Mac/Unix local file
        // returns the text of the file, or null if the operation cannot be performed or false if there was an error
        load: function(filePath,success,failure) {
            try {
                var d = this.getDriver();
                if (d.isAsync) {
                    d.loadFile(filePath,success,failure);
                } else {
                    success(d.loadFile(filePath));
                }
            } catch (e) {
                failure(e);
            }
        },
        // Saves a string to a text file on the local file system
        // filePath is the path to the file in the format described above
        // content is the string to save
        // returns true if the file was saved successfully, or null if the operation cannot be performed or false if there was an error
        save: function(filePath, content,success,failure) {
            try {
                var d = this.getDriver();
                if (d.isAsync) {
                    d.saveFile(filePath,content,success,failure);
                } else {
                    success(d.saveFile(filePath, content));
                }
            } catch (e) {
                failure(e);
            }
        },
        // Copies a file on the local file system
        // dest is the path to the destination file in the format described above
        // source is the path to the source file in the format described above
        // returns true if the file was copied successfully, or null if the operation cannot be performed or false if there was an error
        copy: function(dest, source,success,failure) {
            var d = this.getDriver();
            if (d && d.copyFile) {
                try {
                    if (d.isAsync) {
                        d.copyFile(dest,source,success,failure);
                    } else {
                        success(d.copyFile(dest, source));
                    }
                } catch (e) {
                    failure(e);
                }
            //-else
            //-    return null;
            } else {//+
                this.load(source,function(c) {
                    if (c) {//+
                        success(this.save(dest, c))//+
                    } else {//+
                        success(null);//+
                    }
                },failure);//+
            }//+
        },
        // Converts a local file path from the format returned by document.location into the format expected by this plugin
        // url is the original URL of the file
        // returns the equivalent local file path
        convertUriToLocalPath: function(url) {
            // Remove any location or query part of the URL
            var originalPath = url.split("#")[0].split("?")[0];
            // Convert file://localhost/ to file:///
            if (originalPath.indexOf("file://localhost/") == 0) 
                originalPath = "file://" + originalPath.substr(16);
            // Convert to a native file format
            //# "file:///x:/path/path/path..." - pc local file --> "x:\path\path\path..."
            //# "file://///server/share/path/path/path..." - FireFox pc network file --> "\\server\share\path\path\path..."
            //# "file:///path/path/path..." - mac/unix local file --> "/path/path/path..."
            //# "file://server/share/path/path/path..." - pc network file --> "\\server\share\path\path\path..."
            var localPath;
            if (originalPath.charAt(9) == ":") // PC local file
                localPath = unescape(originalPath.substr(8)).replace(new RegExp("/", "g"), "\\");
            else if (originalPath.indexOf("file://///") == 0) // Firefox PC network file
                localPath = "\\\\" + unescape(originalPath.substr(10)).replace(new RegExp("/", "g"), "\\");
            else if (originalPath.indexOf("file:///") == 0) // Mac/UNIX local file
                localPath = unescape(originalPath.substr(7));
            else if (originalPath.indexOf("file:/") == 0) // Mac/UNIX local file
                localPath = unescape(originalPath.substr(5));
            else if (originalPath.indexOf("//") == 0) // PC network file
                localPath = "\\\\" + unescape(originalPath.substr(7)).replace(new RegExp("/", "g"), "\\");
            return localPath || originalPath;
        },
        
        // Private functions
        
        // Returns a reference to the current driver
        getDriver: function() {
            if (this.currentDriver === null) {
                for (var t = 0; t < this.driverList.length; t++) {
                    if (this.currentDriver === null && drivers[this.driverList[t]].isAvailable && drivers[this.driverList[t]].isAvailable()) { 
                        this.currentDriver = drivers[this.driverList[t]];
                        console.info("Using file access driver: " + this.driverList[t]);
                        break;
                    }
                }
                if (this.currentDriver === null) {
                    throw "Story Steward can't write to the local file system.";
                }
            }
            return this.currentDriver;
        }
    });
    
    // Deferred initialisation for any drivers that need it
    //-	$(function() {
    // NOTE: This does mean that you should call this object in an addOnLoad after 
    // 'requiring' this file.
    dojo.addOnLoad(function() { //+
        for (var t in drivers) {
            if (drivers[t].deferredInit) 
                drivers[t].deferredInit();
        }
    });
    
    // Private driver implementations for each browser
    
    var drivers = {};
    
    // Nodejs driver, for node-webkit. This is by far the preferred driver, and
    // if it's available, then it should be used first.
    drivers.node = {
        name: "nodejs",
        isAvailable: function() {
            if (require && !this.fs) {
                this.fs = require('fs');
                return !!this.fs;
            }
            return !!this.fs;
        },
        isAsync: true,
        loadFile: function(filePath,success,failure) {
            this.fs.readFile(filePath,'utf8',function(err,data) {
                if (err) {
                    if (err.code === 'ENOENT') {
                        success(null);
                    } else {
                        failure("Can't Load file '" + filePath + "': " + err);
                    }
                } else {
                    success(data);
                }
            });
        },
        createParentDirectories: function(filePath,success,failure) {
            var me = this;
            if (!me.path) {
                me.path = require('path');
            }
            var dirname = me.path.dirname(filePath);
            var atRoot = dirname === filePath;
            me.fs.exists(dirname,function(exists) {
                if (exists) {
                    success();
                } else {
                    if (atRoot) {
                       failure("Root directory '" + dirname + "' does not exist, and can not be created.");
                       return;
                    }
                    me.createParentDirectories(dirname,function() {
                        me.fs.mkdir(dirname,0755,function(err) {
                            if (err) {
                                failure("Can't create directory '" + dirname + "': " + err);
                            } else {
                                success();
                            }
                        });
                    },failure);
                }
            });
        },
        saveFile: function(filePath,content,success,failure) {
            var me = this;
            me.createParentDirectories(filePath,function() {
                me.fs.writeFile(filePath,content,'utf8',function(err) {
                    if (err) {
                        failure("Can't save file '" + filePath + "': " + err);
                    } else {
                        success();
                    }
                });
            },function(err) {
                failure("Can't save file '" + filePath + "': " + err);
            });
        },
        copyFile: function(dest,source,success,failure) {
            var me = this;
            me.createParentDirectories(dest,function() {
                try {
                    var failed = false;
                    // Need to make sure we don't call failure more than once,
                    // since this error handler will be called on both the reader
                    // and the writer errors, which may both happen if one
                    // happens.
                    var errorHandler = function(err) {
                        if (!failed) {
                            failed = true;
                            if (err.code === 'ENOENT') {
                                // this is actually a success, since it would
                                // be if the driver didn't support it's own copy.
                                success();
                            } else {
                                failure("Can't copy file '" + source + "' to '" + dest + "': " + err);
                            }
                        }
                    }
                    var reader = me.fs.createReadStream(source);
                    var writer = me.fs.createWriteStream(dest);
                    writer.on('error',errorHandler);
                    reader.on('error',errorHandler);
                    // in theory, this will be called when everything's done.
                    writer.on('close',function() {
                        // I don't think this *should* happen, but just in case.
                        if (!failed) {
                            success();
                        }
                    }); 
                    reader.pipe(writer);
                } catch (ex) {
                    failure("Can't copy file '" + source + "' to '" + dest + "': " + ex); //+
                }
            },function(err) {
                failure("Can't copy file '" + source + "' to '" + dest + "': " + ex);
            });
        }
    }
    
    // requestFileSystem, available on chrome and in cordova. This is a poor driver to have,
    // since we don't have access to the whole system, just a subset, but I'll use
    // what I can.
    // Note that this creates files at a sandboxed location on the computer. If full paths
    // are given, it will attempt to write to those paths as subfolders of this location,
    // which will throw errors if that path is invalid, for some reason. Users who use
    // it in this manner should get used to specifying single file names.
    // FUTURE: This is currently untestable. Node-webkit comes with a segmentation fault
    // when requesting disk space, but I can use the node fs system there, which is
    // better anyway. I'll have to try this on chromium sometime.
    drivers.requestFileSystem = {
        name: "requestFileSystem",
        isAvailable: function() {
            if (window && (!this.fileSystemMethod)) {
                if (window.requestFileSystem) {
                    this.fileSystemMethod = "requestFileSystem";
                } else if (window.webkitRequestFileSystem) {
                    this.fileSystemMethod = "webkitRequestFileSystem";
                }
            }
            return !!this.fileSystemMethod;
        },
        isAsync: true,
        
        // This is asking for 256 MB of disk space. That's almost a quarter of a gig, which is quite a lot
        // on a low-end tablet, but with all of the backups, Story Steward can build up, especially with
        // multiple novels. 
        // FUTURE: Need some way to configure this, so that we can start small and let the user increase
        // it as he/she wants.
        requestedQuotaSizeInMB: 256,
        
        getRootDirectory: function(writable, success,failure) {
            var me = this;
            var PERSISTENT = window.PERSISTENT || (LocalFileSystem && LocalFileSystem.PERSISTENT);
            // Need the quota converted to bits.
            var requestedQuotaSize = this.requestedQuotaSizeInMB * 1024 * 1024; 
            if (writable && window.webkitStorageInfo) {
                console.info("Requesting storage quota of " + requestedQuotaSize + " bytes.");
                // we probably have to request storage here instead. I don't think this exists on cordova.
                window.webkitStorageInfo.requestQuota(PERSISTENT,requestedQuotaSize, function(grantedBytes) {
                    console.info("Given " + grantedBytes + " bytes storage");
                    window[me.fileSystemMethod](PERSISTENT,grantedBytes,function(fs) {
                        success(fs.root);
                    },failure);
                },failure);
            } else {
                // we don't need to ask for a quota if we're just reading, but so we don't have to worry
                // about writing to it later...
                window[me.fileSystemMethod](PERSISTENT,requestedQuotaSize,function(fs) {
                    success(fs.root);
                },failure);
            }
            
            
            
            
        },
        translateFileError: function(error) {
            switch (error.code) {
                case FileError.NOT_FOUND_ERR:
                    return "File not found.";
                case FileError.SECURITY_ERR:
                    return "Operation not permitted.";
                case FileError.ABORT_ERR:
                    return "Operation aborted.";
                case FileError.NOT_READABLE_ERR:
                    return "File is not readable.";
                case FileError.ENCODING_ERR:
                    return "File encoding error.";
                case FileError.NO_MODIFICATION_ALLOWED_ERR:
                    return "File is not writable.";
                case FileError.INVALID_STATE_ERR:
                    return "Invalid State";
                case FileError.SYNTAX_ERR:
                    return "Syntax Error.";
                case FileError.INVALID_MODIFICATION_ERR:
                    return "Invalid modification.";
                case FileError.QUOTA_EXCEEDED_ERR:
                    return "Quota exceeded.";
                case FileError.TYPE_MISMATCH_ERR:
                    return "Type mismatch.";
                case FileError.PATH_EXISTS_ERR:
                    return "Path already exists.";
                default:
                    if (error.code) {
                        return "Unknown error";
                    }
                    return error;
            }
        },
        loadFile: function(filePath,success,failure) {
            var me = this;
            var internalFailure = function(err) {
                var result = me.translateFileError(err);
                failure(result);
            }
            this.getRootDirectory(false,function(root) {
                root.getFile(filePath,{},function(fileEntry) {
                    fileEntry.file(function(file) {
                        try {
                            var reader = new FileReader();
                            reader.onloadend = function(e) {
                                success(e.target.result);
                            }
                            reader.onerror = internalFailure;
                            reader.readAsText(file);
                        } catch (ex) {
                            internalFailure(ex);
                        }
                    },internalFailure);
                },function(ex) {
                    if (ex.code === FileError.NOT_FOUND_ERR) {
                        success(null);
                    } else {
                        internalFailure(ex);
                    }
                });
            },internalFailure);
        },
        createDirectories: function(dirEntry,folders,success,failure) {
            var me = this;
            // remove blank folders caused by intial slash,
            while (folders[0] === "") {
                folders = folders.slice(1);
            }
            if (folders.length) {
                console.info("Creating directory '" + folders[0] + "'");
                dirEntry.getDirectory(folders[0], {create: true}, function(childEntry) {
                    me.createDirectories(childEntry,folders.slice(1),success,failure);
                },failure);
            } else {
                console.info("Directories created");
                success(dirEntry);
            }
        },
        saveFile: function(filePath,content,success,failure) {
            var me = this;
            var internalFailure = function(err) {
                var result = me.translateFileError(err);
                failure(result);
            }
            this.getRootDirectory(true,function(root) {
                // have to create the directory, first.
                var folders = filePath.split("/");
                var baseName = filePath.slice(-1);
                folders = folders.slice(0,-1);
                me.createDirectories(root,folders,function(dirEntry) {
                    dirEntry.getFile(baseName,{create: true},function(fileEntry) {
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function() {
                                success();
                            }
                            fileWriter.onerror = internalFailure;
                            fileWriter.write(content);
                        }, internalFailure);
                    },internalFailure);
                },internalFailure);
            },internalFailure);
        }
        // copy not implemented here, since the implementation would be the same as the default implementation.
    }

    // Internet Explorer driver
    
    drivers.activeX = {
        name: "activeX",
        isAvailable: function() {
            try {
                var fso = new ActiveXObject("Scripting.FileSystemObject");
            } catch (ex) {
                return false;
            }
            return true;
        },
        loadFile: function(filePath) {
            // Returns null if it can't do it (file doesn't exist), false if there's an error, or a string of the content if successful
            try {
                var fso = new ActiveXObject("Scripting.FileSystemObject");
				if (fso.FileExists(filePath)) {
					var file = fso.OpenTextFile(filePath, 1);
					var content = file.ReadAll();
					file.Close();
					return content;
				} else {
					return null;
				}
            } catch (ex) {
                //# alert("Exception while attempting to load\n\n" + ex.toString());
                //- return null;
                throw "Can't Load file '" + filePath + "': " + ex; //+
            }
        },
        createPath: function(path) {
            //# Remove the filename, if present. Use trailing slash (i.e. "foo\bar\") if no filename.
            var pos = path.lastIndexOf("\\");
            if (pos != -1) 
                path = path.substring(0, pos + 1);
            //# Walk up the path until we find a folder that exists
            var scan = [path];
            try {
                var fso = new ActiveXObject("Scripting.FileSystemObject");
                var parent = fso.GetParentFolderName(path);
                while (parent && !fso.FolderExists(parent)) {
                    scan.push(parent);
                    parent = fso.GetParentFolderName(parent);
                }
                //# Walk back down the path, creating folders
                for (i = scan.length - 1; i >= 0; i--) {
                    if (!fso.FolderExists(scan[i])) {
                        fso.CreateFolder(scan[i]);
                    }
                }
                return true;
            } catch (ex) {
            }
            return false;
        },
        copyFile: function(dest, source) {
            drivers.activeX.createPath(dest);
            try {
                var fso = new ActiveXObject("Scripting.FileSystemObject");
                fso.GetFile(source).Copy(dest);
            } catch (ex) {
                return false;
            }
            return true;
        },
        saveFile: function(filePath, content) {
            // Returns null if it can't do it, false if there's an error, true if it saved OK
            drivers.activeX.createPath(filePath);
            try {
                var fso = new ActiveXObject("Scripting.FileSystemObject");
                var file = fso.OpenTextFile(filePath, 2, -1, 0);
                file.Write(content);
                file.Close();
            } catch (ex) {
                //- return null;
                throw "Can't Save file '" + filePath + "': " + ex; //+				
            }
            return true;
        }
    };
    
    // Mozilla driver
    
    drivers.mozilla = {
        name: "mozilla",
        isAvailable: function() {
            return !!window.Components;
        },
        loadFile: function(filePath) {
            // Returns null if it can't do it, false if there's an error, or a string of the content if successful
            if (window.Components) {
                try {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
                    file.initWithPath(filePath);
                    if (!file.exists()) 
                        return null;
                    var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
                    inputStream.init(file, 0x01, 00004, null);
                    var sInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
                    sInputStream.init(inputStream);
                    var contents = sInputStream.read(sInputStream.available());
                    sInputStream.close();
                    inputStream.close();
                    return contents;
                } catch (ex) {
                    //# alert("Exception while attempting to load\n\n" + ex);
                    //- return false;
                    throw "Can't Load file '" + filePath + "': " + ex; //+
                }
            }
            return null;
        },
        copyFile: function(dest, source) { //+
            // Returns false if source is not found, or true if successful //+
            if (window.Components) { //+
                try { //+
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect"); //+
                    var srcfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile); //+
                    srcfile.initWithPath(source); //+
                    if (!srcfile.exists()) //+ 
                        return false; //+
					// This works a little oddly, since I need to copy to the directory //+
					// and filename, instead of just passing the filename. //+ 
                    var destfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile); //+
                    destfile.initWithPath(dest); //+
					var destdir = destfile.parent; //+
                    if (destfile.exists()) { //+
						destfile.remove(false); //+
					} //+
					srcfile.copyTo(destdir,destfile.leafName); //+
                } catch (ex) { //+
                    throw "Can't copy file '" + source + "' to '" + dest + "': " + ex; //+
                } //+
            } //+
            return true; //+
        }, //+
        saveFile: function(filePath, content) {
            // Returns null if it can't do it, false if there's an error, true if it saved OK
            if (window.Components) {
                try {
                    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
                    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
                    file.initWithPath(filePath);
                    if (!file.exists()) 
                        file.create(0, 0664);
                    var out = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
                    out.init(file, 0x20 | 0x02, 00004, null);
                    out.write(content, content.length);
                    out.flush();
                    out.close();
                    return true;
                } catch (ex) {
                    //-alert("Exception while attempting to save\n\n" + ex);
                    //-return false;
                    throw "Can't Save file '" + filePath + "': " + ex; //+
                }
            }
            return null;
        }
    };
    
    // TiddlySaver driver
    
    drivers.tiddlySaver = {
        name: "tiddlySaver",
        deferredInit: function() {
            //-			if(!document.applets["TiddlySaver"] && !$.browser.mozilla && !$.browser.msie && document.location.toString().substr(0,5) == "file:") {
            // NOTE: I've changed this from browser sniffing to capabilities sniffing. Not that any browsers are going to be supporting the mozilla and activeX mechanisms, but just in case... //+
            if (!document.applets["TiddlySaver"] && !drivers.mozilla.isAvailable() && !drivers.activeX.isAvailable() && document.location.toString().substr(0, 5) == "file:") { //+
                //-				$(document.body).append("<applet style='position:absolute;left:-1px' name='TiddlySaver' code='TiddlySaver.class' archive='TiddlySaver.jar' width='1'height='1'></applet>");
                dojo.place("<applet style='position:absolute;left:-1px' name='TiddlySaver' code='TiddlySaver.class' archive='TiddlySaver.jar' width='1'height='1'></applet>", dojo.body(), "last"); //+		
            }
        },
        isAvailable: function() {
            var applet = document.applets["TiddlySaver"];
            return !!(applet.loadFile && applet.saveFile);
        },
        loadFile: function(filePath) {
            var r;
            try {
                if (document.applets["TiddlySaver"]) {
                    r = document.applets["TiddlySaver"].loadFile(javaUrlToFilename(filePath), "UTF-8");
                    return (r === undefined || r === null) ? null : String(r);
                }
            } catch (ex) {
                throw "Can't Load file '" + filePath + "': " + ex; //+
            }
            return null;
        },
        saveFile: function(filePath, content) {
            try {
                if (document.applets["TiddlySaver"]) 
                    return document.applets["TiddlySaver"].saveFile(javaUrlToFilename(filePath), "UTF-8", content);
            } catch (ex) {
                throw "Can't Save file '" + filePath + "': " + ex; //+
            }
            return null;
        }
    }
    
    // Java LiveConnect driver
    
    drivers.javaLiveConnect = {
        name: "javaLiveConnect",
        isAvailable: function() {
            return !!window.java && !!window.java.io && !!window.java.io.FileReader;
        },
        loadFile: function(filePath) {
            var r;
            var content = [];
            try {
                r = new java.io.BufferedReader(new java.io.FileReader(javaUrlToFilename(filePath)));
                var line;
                while ((line = r.readLine()) != null) 
                    content.push(new String(line));
                r.close();
            } catch (ex) {
                //-return null;
                throw "Can't Load file '" + filePath + "': " + ex; //+
            }
            return content.join("\n") + "\n";
        },
        saveFile: function(filePath, content) {
            try {
                var s = new java.io.PrintStream(new java.io.FileOutputStream(javaUrlToFilename(filePath)));
                s.print(content);
                s.close();
            } catch (ex) {
                //-return null;
                throw "Can't Save file '" + filePath + "': " + ex; //+
            }
            return true;
        }
    }
    
    // Private utilities
    
    function javaUrlToFilename(url) {
        var f = "//localhost";
        if (url.indexOf(f) == 0) 
            return url.substring(f.length);
        var i = url.indexOf(":");
        return i > 0 ? url.substring(i - 1) : url;
    }
    
    //-})(jQuery);
})(); //+
