dojo.provide("my.Settings");
dojo.getObject("my.Settings", true);

(function() {

    var getSiblingUri = function(filename) {
        var location = dojo.global.location.href;
        // strip off the current file.
        location = location.substring(0, location.lastIndexOf('/'));
        return location + "/" + filename;
        
    }
    
    var driver = {
        saveSerialized: function(content) {
        },
        loadSerialized: function() {
            return null;
        },
        loadObject: function() {
            return dojo.when(this.loadSerialized(), function(data) {
                return dojo.fromJson(data || "{}");
            })
        },
        saveObject: function(data) {
            return this.saveSerialized(dojo.toJson(data),true);
        }
    }
    if (dojo.global.location.href.indexOf("http:") == 0) {
        driver.cookieName = "usersettings";
        driver.fileUri = getSiblingUri("usersettings.json");
        driver.loadObject = function() {
            return dojo.xhrGet({
                url: driver.fileUri,
                handleAs: "json",
            }).then(function(data) {
                var cookie = dojo.cookie(driver.cookieName);
                dojo.mixin(data, dojo.fromJson(cookie));
            });
        }
    } else if (dojo.global.location.href.indexOf("file:") == 0) {
        driver.filePath = my.LocalFileAccess.convertUriToLocalPath(getSiblingUri("usersettings.json"));
        driver.saveSerialized = function(content) {
			my.LocalFileAccess.save(driver.filePath,content)
        }
        driver.loadSerialized = function() {
            return my.LocalFileAccess.load(driver.filePath);
        }
        
    }
    
    var loadedFirstTime = false;
    
    var userSettingsData = {};
    
    dojo.mixin(my.Settings, {
    
        load: function() {
            var result = new dojo.Deferred();
            try {
                dojo.when(driver.loadObject(), dojo.hitch(this, function(data) {
					userSettingsData = data;				
                    loadedFirstTime = true;
                    result.callback(data);
                }), function(ex) {
                    result.errback(ex);
                });
            } catch (ex) {
                result.errback(ex);
            }
            return result;
        },
        
        save: function() {
            var result = new dojo.Deferred();
            try {
                dojo.when(driver.saveObject(userSettingsData), dojo.hitch(this, function() {
                    result.callback();
                }), function(ex) {
                    result.errback(ex);
                });
            } catch (ex) {
                result.errback(ex);
            }
            return result;
            
        },
        
        get: function() {
			if (!loadedFirstTime) {
                return this.load();
            } else {
				return userSettingsData;
            }
        }
        
        
    });
    
})();
