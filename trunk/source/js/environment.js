// Utilities for working with the host environment in a uniform manner.
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
(function() {
    
    // first, determine what environment we're in.
    var environmentName;
    (function() {
        if (process && process.versions['node-webkit']) {
            environmentName = "node-webkit";
        } else {
            environmentName = "browser";
        }
    })();
    
    var Environment = function() {
        var me = this;
        var closeQueries = [];
        
        var closeQuery = function() {
            for (var i = 0; i < closeQueries.length; i++) {
                if (!closeQueries[i]()) {
                    return false;
                }
                return true;
            }
        }
        
        this.addCloseQuery = function(callback) {
            closeQueries.push(callback);
        };
        
        this.removeCloseQuery = function(callback) {
            var index = closeQueries.indexOf(callback);
            if (index > -1) {
                closeQueries.splice(index,1);
            }
        }
        
        this.closeQueryMessage = "You have unsaved changes. Are you sure you want to close?";

        this.getSiblingUri = function(filename) {
            var location = dojo.global.location.href;
            // strip off the current file.
            location = location.substring(0, location.lastIndexOf('/'));
            return location + "/" + filename;
        }
        
        
        
        // environment specific code:
        switch (environmentName) {
            case "node-webkit":
                var path = require('path');
                var nw = require('nw.gui').Window.get();
                // need to keep track of this, since nw doesn't seem to do so itself.
                var maximized = false;
                
                // FUTURE: When unmaximizing, the window does not currently remember
                // what size it was unmaximized in the previous session.
                
                nw.on('close',function() {
                    if (!closeQuery()) {
                        var result = confirm(me.closeQueryMessage);
                        if (!result) {
                            return false;
                        }
                    } 
                    localStorage.appWindowBounds = JSON.stringify({
                        x: nw.x,
                        y: nw.y,
                        width: nw.width,
                        height: nw.height,
                        maximized: maximized
                    })
                    nw.close(true);
                });
                
                nw.on('maximize',function() {
                    maximized = true;
                });
                
                nw.on('unmaximize',function() {
                    maximized = false;
                });

                // FUTURE: This causes a weird flickering prior to 
                // it reaching it's correct size. The only way to fix this
                // is to start it up hidden and move it after showing, but
                // this causes the dojo widgets to be rendered badly.
                // One way to resolve the issue might be to make sure this gets
                // run before the controller's addOnLoad.
                dojo.addOnLoad(function() {
                    if (localStorage.appWindowBounds) {
                        var appWindow = JSON.parse(localStorage.appWindowBounds);
                        if (appWindow.maximized) {
                            // just maximize, so the unmaximized returns
                            // to the default position.
                            nw.maximize();
                        } else {
                            nw.moveTo(appWindow.x,appWindow.y);
                            nw.resizeTo(appWindow.width,appWindow.height);
                        } 
                    }
                                
                });

                this.getLocalSettingsPath = function(filename) {
                    switch (process.platform) {
                        case "win32":
                            return path.join(process.env['APPDATA'],"Story Steward",filename);
                        case "sunos": // TODO: Untested
                        case "freebsd": // TODO: Untested
                        case "linux":
                            return path.join(process.env['HOME'],".story-steward",filename);
                        case "darwin":
                        // TODO: Test this.
                            return path.join(process.env['HOME'],"Library","Preferences","story-steward",filename);
                        default:
                            throw "Settings directory can not be retrieved on this platform.";
                    }
                }

                break;
            case "browser":
            default:
                dojo.addOnBeforeUnload(dojo.hitch(this, function() {
                    if (!closeQuery()) {
                        return me.closeQueryMessage;
                    }
                }));
                
                this.getLocalSettingsPath = function(filename) {
                    return my.LocalFileAccess.convertUriToLocalPath(this.getSiblingUri(filename));
                }
                break;
        }
        
    }
            
    window.environment = new Environment();
})();
