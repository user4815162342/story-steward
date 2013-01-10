dojo.provide("my.Settings");
dojo.getObject("my.Settings", true);

(function() {

    // Added the "lastUsed" date to this. For some reason, this was not being set, but it didn't
    // cause an error until I moved the settings file to a non-sibling directory.
	var defaultSettings = '{"recentProjects":[{"uri":"sample://TheDarkHorizon", "lastUsed":"' + (new Date()).toISOString() + '"}]}';
    
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
            return dojo.when(this.saveSerialized(dojo.toJson(data),true));
        }
    }
    if (dojo.global.location.href.indexOf("http:") == 0) {
        driver.cookieName = "usersettings";
        driver.fileUri = environment.getSiblingUri("usersettings.json"); 
        driver.loadObject = function() {
			var result = new dojo.Deferred();
            dojo.xhrGet({
                url: driver.fileUri,
                handleAs: "json"
            }).then(function(data) {
				var cookie = dojo.cookie(driver.cookieName);
				if (cookie) {
					dojo.mixin(data, dojo.fromJson(cookie));
				}
				result.callback(data);
            }, function(ex,ioargs) {
				if (ioargs.xhr.status == 404) {
					result.callback(defaultSettings);					
				} else {
					result.errback(ex);
				}
			});
			return result;
        }
    } else if (dojo.global.location.href.indexOf("file:") == 0) {
        driver.filePath = environment.getLocalSettingsPath("usersettings.json");
        driver.saveSerialized = function(content) {
            var result = new dojo.Deferred();
			my.LocalFileAccess.save(driver.filePath,content,function() {
                result.callback();
            },function(e) {
                result.errback(e);
            });
            return result;
        }
        driver.loadSerialized = function() {
            var result = new dojo.Deferred();
			my.LocalFileAccess.load(driver.filePath, function(data) {
                if (data == null) {
                    data = defaultSettings;
                } 
                result.callback(data);
            },function(e) {
                result.errback(e);
            });
            return result;
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
