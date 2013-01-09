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
dojo.provide("my.ProjectData");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("my.screens.ContentContainerViewer");
dojo.require("my.screens.CreditViewer");
dojo.require("my.screens.GoalViewer");
dojo.require("my.screens.JournalViewer");
dojo.require("my.screens.NoteViewer");
dojo.require("my.screens.PersonViewer");
dojo.require("my.screens.PlaceViewer");
dojo.require("my.screens.ProjectViewer");
dojo.require("my.screens.SceneViewer");
dojo.require("my.screens.ThingViewer");
dojo.require("my.schemas.ProjectDataValidator");
dojo.require("my.utilities");
dojo.require("my.data.History");
dojo.declare("my.ProjectData", null, {

    TypeLookup: {
        "content": {
            isAbstract: true
        },
        "project": {
            screenComponent: my.screens.ProjectViewer,
            baseType: "project",
            typeLabel: "Project",
            defaultValue: {},
            allowedParents: [],
            childrenAttributes: [],
            CLOBAttributes: [],
            iconClass: "iconEditProject"
        },
        "book": {
			screenComponent: my.screens.ContentContainerViewer,
            baseType: "content",
            typeLabel: "Book",
            allowedParents: [],
            defaultValue: {},
            childrenAttributes: ["content"],
            CLOBAttributes: [],
            iconClass: "iconBook",
            titleTag: "h1"
        },
        "part": {
			screenComponent: my.screens.ContentContainerViewer,
            baseType: "content",
            typeLabel: "Part",
            allowedParents: ["book"],
            defaultValue: {},
            childrenAttributes: ["content"],
            CLOBAttributes: [],
            iconClass: "iconPart",
            titleTag: "h2"
        },
        "chapter": {
			screenComponent: my.screens.ContentContainerViewer,
            baseType: "content",
            typeLabel: "Chapter",
            allowedParents: ["book", "part"],
            defaultValue: {},
            childrenAttributes: ["content"],
            CLOBAttributes: [],
            iconClass: "iconChapter",
            titleTag: "h3"
        },
        "scene": {
            screenComponent: my.screens.SceneViewer,
            baseType: "content",
            typeLabel: "Scene",
            allowedParents: ["book", "part", "chapter"],
            defaultValue: {},
            childrenAttributes: [],
            CLOBAttributes: ["notes", "text"],
            iconClass: "iconScene",
			titleTag: "h3"
			// NOTE: This is the same as chapter, as the title of a scene
			// should only be shown if it's outside of a chapter, and therefore
			// at the same 'level'. This allows scenes used as introductions, epilogues, etc.
			// to be titled.
        },
        "note": {
            screenComponent: my.screens.NoteViewer,
            baseType: "note",
            typeLabel: "Note",
            defaultValue: {},
            childrenAttributes: ["subnotes"],
            allowedParents: ["note"],
            CLOBAttributes: ["text"],
            iconClass: "iconNote"
        },
        "journal": {
            screenComponent: my.screens.JournalViewer,
            baseType: "journal",
            typeLabel: "Entry",
            defaultValue: {},
            childrenAttributes: [],
            allowedParents: [],
            initialize: function(item) {
                item.posted = new Date();
            },
            CLOBAttributes: ["text"],
            iconClass: "iconJournal"
        },
        "person": {
            screenComponent: my.screens.PersonViewer,
            baseType: "person",
            typeLabel: "Person",
            defaultValue: {},
            childrenAttributes: [],
            allowedParents: [],
            CLOBAttributes: ["biography", "notes"],
            iconClass: "iconPerson"
        },
        "place": {
            screenComponent: my.screens.PlaceViewer,
            baseType: "place",
            typeLabel: "Place",
            defaultValue: {},
            childrenAttributes: [],
            allowedParents: [],
            CLOBAttributes: ["background", "notes"],
            iconClass: "iconPlace"
        },
        "thing": {
            screenComponent: my.screens.ThingViewer,
            baseType: "thing",
            typeLabel: "Thing",
            defaultValue: {},
            childrenAttributes: [],
            allowedParents: [],
            CLOBAttributes: ["background", "notes"],
            iconClass: "iconThing"
        },
        "goal": {
            screenComponent: my.screens.GoalViewer,
            baseType: "goal",
            typeLabel: "Goal",
            defaultValue: {},
            childrenAttributes: [],
            allowedParents: [],
            CLOBAttributes: [],
            iconClass: "iconGoal"
        }
    },
    
    genericDataStoreTypeMap: {
    },
    
    constructor: function() {
        this.isOpen = false;
        this.isDirty = false;
        this.ReadOnly = true;
        
        this.ProjectStore = new dojo.data.ItemFileWriteStore({
            data: this._createProjectData(),
            typeMap: this.genericDataStoreTypeMap
        });
		
		this.History = new my.data.History({
			projectData: this
		});
				
        // add save action
        var projectData = this;
        
        this.ProjectStore._serializeValue = function(/* anything */value, forceReference) {
            // Similar to ItemFileReadStore._flatten, except
            // only items found at the toplevel are turned into references, the rest are returned
            // using _serializeItem.
            
            if (this.isItem(value)) {
                var item = value;
                if ((!forceReference) && (dojo.indexOf(this._arrayOfTopLevelItems, item) == -1)) {
                    return this._serializeItem(item);
                } else {
                    // Given an item, return an serializable object that provides a 
                    // reference to the item.
                    // For example, given kermit:
                    //    var kermit = store.newItem({id:2, name:"Kermit"});
                    // we want to return
                    //    {_reference:2}
                    var identity = this.getIdentity(item);
                    var referenceObject = {
                        _reference: identity
                    };
                    return referenceObject;
                }
            } else {
				if (typeof value === "object") {
                    for (var type in this._datatypeMap) {
                        var typeMap = this._datatypeMap[type];
                        if (dojo.isObject(typeMap) && !dojo.isFunction(typeMap)) {
                            if (value instanceof typeMap.type) {
                                if (!typeMap.serialize) {
                                    throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: [" + type + "]");
                                }
                                return {
                                    _type: type,
                                    _value: typeMap.serialize(value)
                                };
                            }
                        } else if (value instanceof typeMap) {
                            //SImple mapping, therefore, return as a toString serialization.
                            return {
                                _type: type,
                                _value: value.toString()
                            };
                        }
                    }
                }
                return value;
            }
        }
		
        
        
        this.ProjectStore._serializeItem = function(item) {
            var serializableItem = {};
            var entityType = this.getValue(item, "type", null);
            for (var key in item) {
                if (key !== this._storeRefPropName && key !== this._itemNumPropName && key !== this._reverseRefMap && key !== this._rootItemPropName) {
                    var attribute = key;
                    var valueArray = this.getValues(item, attribute);
                    // The 'what' field would be returned as a reference. However, since the
                    // value of the item would be a book, part or chapter, and might not be found 
                    // at the root level, it might be serialized as an item. So, we need to
                    // force it.
                    var forceReference = (entityType == "goal") && (attribute == "where");
                    if (valueArray.length == 1) {
                        serializableItem[attribute] = this._serializeValue(valueArray[0], forceReference);
                    } else {
                        var serializableArray = [];
                        for (var j = 0; j < valueArray.length; ++j) {
                            serializableArray.push(this._serializeValue(valueArray[j], forceReference));
                        }
                        serializableItem[attribute] = serializableArray;
                    }
                }
            }
            return serializableItem;
            
        }
        
        this.ProjectStore._getFileContent = function() {
            // Similar to ItemFileReadStore._getNewFileContentString, except:
            // 1. Returns an actual JavaScript object, not a string.
            // 2. Only returns the items as an array, not the other stuff.
            // 3. Uses arrayOfTopLevelItems to start, and calls _serializeItem to do the serializing.
            // 4. Only items also appearing at arrayOfTopLevelItems are flattened when referenced, the rest are
            // included inline.
            // 5. A couple of other things are flattened as well based on the expected schema
            var serializableItems = [];
            
            for (var i = 0; i < this._arrayOfTopLevelItems.length; ++i) {
                var item = this._arrayOfTopLevelItems[i];
                if (item !== null) {
                    var serializableItem = this._serializeItem(item);
                    serializableItems.push(serializableItem);
                }
            }
            return serializableItems;
            
        }
        
        this.ProjectStore._getSaver = function() {
            // FUTURE: Will someday need a mechanism for just getting changed items.
            var getLookupValues = function(store) {
                var deferredResult = new dojo.Deferred();
                try {
                    store.fetch({
                        onComplete: function(items) {
                            var result = [];
                            for (var i = 0; i < items.length; i++) {
                                result.push({
                                    name: store.getValue(items[i], "name")
                                });
                            }
                            deferredResult.callback(result)
                        },
                        onError: function(ex) {
                            deferredResult.errback(ex)
                        }
                    });
                } catch (ex) {
                    deferredResult.errback(ex);
                }
                
                return deferredResult;
            }
            
            var store = this;
            
            
            return {
                GetTags: function() {
                    return getLookupValues(projectData.Customizations.Tags);
                },
                
                GetSceneStatuses: function() {
                    return getLookupValues(projectData.Customizations.Scene.Statuses);
                },
                
                GetSceneStructures: function() {
                    return getLookupValues(projectData.Customizations.Scene.Structures);
                },
                GetSceneImportances: function() {
                    return getLookupValues(projectData.Customizations.Scene.Importances);
                },
                GetSceneRatings: function() {
                    var result = new dojo.Deferred();
                    result.callback(projectData.Customizations.Scene.Ratings);
                    return result;
                },
                GetPersonRoles: function() {
                    return getLookupValues(projectData.Customizations.Person.Roles);
                },
                GetPersonImportances: function() {
                    return getLookupValues(projectData.Customizations.Person.Importances);
                },
                GetPersonRatings: function() {
                    var result = new dojo.Deferred();
                    result.callback(projectData.Customizations.Person.Ratings);
                    return result;
                },
                GetInterfaceSettings: function() {
                    return projectData.InterfaceSettings;
                },
				GetHistory: function() {
					return projectData.History.serialize();
				},
                GetEntities: function() {
                    return store._getFileContent();
                }
            }
            
        }
        
        this.ProjectStore._saveCustom = function(saveCompleteCallback, saveFailedCallback) {
            if (projectData._handler) {
                projectData.onBeginSave(projectData);
                try {
                    projectData._handler.save(this._getSaver()).then(function() {
                        saveCompleteCallback();
                        projectData.onEndSave(projectData);
                        
                    }, function(e) {
                        projectData.onSaveError(e);
                        saveFailedCallback(e);
                    });
                } catch (e) {
                    this.onSaveError(e);
                    saveFailedCallback(e);
                }
            }
        }
        
        // add triggers.
        this._connects = [dojo.connect(this.ProjectStore, "onSet", this, function(item, attribute, oldValue, newValue) {
			if (oldValue != newValue) {
				if ((oldValue instanceof Date) && (dojo.date.compare(oldValue, newValue) === 0)) {
					return;
				}
				if ((item)) {
					switch (attribute) {
						case "modified":
							// make sure we don't end up in an infinite loop, and
							// make sure the item is actually set.
							break;
						case "name":
							if (this.ProjectStore.getValue(item, "type", null) == "project") {
								var value = newValue;
								if (dojo.isArray(value)) {
									if (dojo.length) {
										value = value[0];
									} else {
										value = null;
									}
								}
								this.onTitleChange(value);
							}
						default:
							this.ProjectStore.setValue(item, "modified", new Date());
					}
				}
				if (!this.isDirty) {
					this.isDirty = this.ProjectStore.isDirty();
					this.onDirtyChange();
				}
			}
		}), dojo.connect(this.ProjectStore, "onNew", this, function() {
            if (!this.isDirty) {
                this.isDirty = this.ProjectStore.isDirty();
                this.onDirtyChange();
            }
        }), dojo.connect(this.ProjectStore, "onDelete", this, function() {
            if (!this.isDirty) {
                this.isDirty = this.ProjectStore.isDirty();
                this.onDirtyChange();
            }
        })];
        
        
    },
    
    destroy: function() {
        while (this._connects.length > 0) {
            dojo.disconnect(this._connects.pop());
        }
    },
    
    _createProjectData: function(items) {
        return {
            label: "name",
            identifier: "uid",
            items: items ||
            []
        }
    },
    
    GetCLOBAttributes: function(item) {
        var type = this.ProjectStore.getValue(item, "type", null);
        if (type && this.TypeLookup.hasOwnProperty(type) && this.TypeLookup[type].isAbstract) {
            type = this.ProjectStore.getValue(item, "subtype", null);
        }
        if (type && this.TypeLookup.hasOwnProperty(type)) {
            return this.TypeLookup[type].CLOBAttributes;
        }
        return [];
        
    },
    
    _assertIsOpen: function() {
        if (!this.isOpen) {
            throw "Project Data has not been opened."
        }
    },
	
	GetProject: function() {
		var result = new dojo.Deferred();
		try {
			this._assertIsOpen();
			this.ProjectStore.fetch({
				query: {
					uid: 'project'
				},
				onItem: function(item) {
					result.callback(item);
				},
				onError: function(ex) {
					result.errback(ex);
				}
			});
		} catch (ex) {
			result.errback(ex);
		}
		return result;
	},
	
	IterateContent: function(request) {
		var _iterate = dojo.hitch(this, function(item) {
			if (request.publishableOnly && this.ProjectStore.getValue(item,"doNotPublish",false)) {
				return;
			}
			switch (this.ProjectStore.getValue(item, "subtype")) {
				case "book":
					request.onBook && request.onBook(item);
					dojo.forEach(this.ProjectStore.getValues(item, "content"), _iterate);
					request.onBookComplete && request.onBookComplete(item);
					break;
				case "part":
					request.onPart && request.onPart(item);
					dojo.forEach(this.ProjectStore.getValues(item, "content"), _iterate);
					request.onPartComplete && request.onPartComplete(item);
					break;
				case "chapter":
					request.onChapter && request.onChapter(item);
					dojo.forEach(this.ProjectStore.getValues(item, "content"), _iterate);
					request.onChapterComplete && request.onChapterComplete(item);
					break;
				case "scene":
					request.onScene && request.onScene(item);
			}
		})
		
		this._assertIsOpen();
		this.ProjectStore.fetch({
			query: {
				type: 'content'
			},
			onBegin: function() {
				request.onBegin && request.onBegin();
			},
			onItem: _iterate,
			onComplete: function() {
				request.onComplete && request.onComplete()
			},
			onError: function(ex) {
				request.onError && request.onError(ex);
			}
		})
	},
	
    NewDataItem: function(type, base, parentInfo) {
        this._assertIsOpen();
        if (this.TypeLookup.hasOwnProperty(type)) {
            if (this.TypeLookup[type].isAbstract) {
                throw "Can't create data item of type " + type;
            }
            if (!base) {
                base = this.TypeLookup[type].defaultValue || {};
            }
            base.type = this.TypeLookup[type].baseType;
            if (type != base.type) {
                base.subtype = type;
            }
            base.uid = my.ProjectData.CreateDataUID();
            base.created = new Date();
            base.modified = new Date();
            if (!base.tags) {
                base.tags = [];
            }
            if ((!base.name) && (base.name !== "")) {
                base.name = "New " + this.TypeLookup[type].typeLabel;
            }
            if (this.TypeLookup[type].initialize) {
                this.TypeLookup[type].initialize(base);
            }
            return this.ProjectStore.newItem(base, parentInfo);
        } else {
            throw "Invalid type for data item: " + type;
        }
    },
    
    _handler: null,
	
	GetURI: function() {
		if (this._handler) {
			return this._handler.getUri();
		}
		return null;
	},
    
    _createIOHandler: function(uriString) {
        var scheme = uriString.split('://')[0];
        if (my.ProjectData.Drivers.hasOwnProperty(scheme)) {
            return my.ProjectData.Drivers[scheme](uriString, this, dojo.hitch(this,this.onMessage));
        }
        return null;
    },
	
	onMessage: function(msg) {
		// NOTE: This is only here for someone to listen to.
	},
    
    _createNewProject: function(defaultName) {
        var now = new Date(); // for creating UID's.
        var me = this;
        var result = {
            /*
             * */
            IsReadOnly: function() {
                return false;
            },
            GetEntities: function() {
                return [{
                    created: now,
                    modified: now,
                    type: "project",
                    uid: "project",
                    name: defaultName,
                    credits: [{
                        created: now,
                        modified: now,
                        type: "credit",
                        uid: my.ProjectData.CreateDataUID(),
                        role: "Author"
                    }]
                }, {
                    created: now,
                    modified: now,
                    type: "content",
                    subtype: "book",
                    uid: my.ProjectData.CreateDataUID(),
                    name: defaultName
                }]
            },
            // FUTURE: Come up with some useful defaults for these, so I can use them
            // until I allow them to be edited.
            GetTags: function() {
                return [{
                    name: "animal"
                }, {
                    name: "vegetable"
                }, {
                    name: "mineral"
                }]
            },
            GetSceneStatuses: function() {
                return [{
                    name: "draft"
                }, {
                    name: "reviewed"
                }, {
                    name: "ready"
                }]
            },
            GetSceneStructures: function() {
                return [{
                    name: "action"
                }, {
                    name: "reaction"
                }]
            },
            GetSceneImportances: function() {
                return [{
                    name: "plot"
                }, {
                    name: "subplot"
                }, {
                    name: "exposition"
                }]
            },
            GetSceneRatings: function() {
                return [{
                    name: "wordiness"
                }, {
                    name: "quality"
                }, {
                    name: "action"
                }, {
                    name: "beauty"
                }];
            },
            GetPersonRoles: function() {
                return [{
                    name: "protagonist"
                }, {
                    name: "antagonist"
                }, {
                    name: "bystander"
                }, {
                    name: "noncommitted"
                }];
            },
            GetPersonImportances: function() {
                return [{
                    name: "major"
                }, {
                    name: "supporting"
                }, {
                    name: "minor"
                }]
            },
            GetPersonRatings: function() {
                return [{
                    name: "depth"
                }, {
                    name: "realism"
                }, {
                    name: "sympathy"
                }, {
                    name: "likeability"
                }]
            },
            GetInterfaceSettings: function() {
                return {};
            },
            GetHistory: function() {
                return [];
            }
        }
        return result;
        
    },
    
    GetJSON: function(options) {
        // FUTURE: At some point in the future, it might be nice to have a 'SetJSON' as well.
        try {
            return my.ProjectData.Drivers._writeStandardJSONFormat(this.ProjectStore._getSaver(),options && options.validate);
        } catch (ex) {
            var result = new dojo.Deferred();
            result.errback(ex);
            return result;
        }
    },
    
    SaveProject: function() {
		var result = new dojo.Deferred();
        try {
            this._assertIsOpen();
            if (this.ReadOnly) {
                throw "Project is Read Only!";
            }
            if (!this._handler) {
                throw "Project has no associated file.";
            }
            this.ProjectStore.save({
                onComplete: result.callback,
                onError: result.errback,
                scope: result
            });
        } catch (ex) {
            result.errback(ex);
        }
        result.then(dojo.hitch(this, function() {
            this.isDirty = false;
            this.onDirtyChange();
        }));
        return result;
    },
    
    _Revert: function() {
        // NOTE: This must be called before reloading new data when there
        // are unsaved changes.
        this.ProjectStore.revert();
    },
    
    
    
    _LoadProject: function(formatHandler, forceReadOnly) {
        this.onBeginLoad(this);
        try {
            if (this.IsDirty()) {
                // We have to call revert first, otherwise the 
                // project store will raise an error when the data is refreshed.
                this._Revert();
                this.isDirty = false;
                this.onDirtyChange();
            }
            this.ReadOnly = forceReadOnly || formatHandler.IsReadOnly();
            // NOTE: This is sort of a hack, as the object still supports
            // the API, but it can be used by less intelligent code
            // to simply turn off editing if readonly is true.
            this.ProjectStore._features['dojo.data.api.Write'] = !this.ReadOnly;
            this.ProjectStore._features['dojo.data.api.Notification'] = !this.ReadOnly;
            
            this.Customizations = {
                Tags: new dojo.data.ItemFileWriteStore({
                    data: {
                        label: "name",
                        identifier: "name",
                        items: formatHandler.GetTags()
                    }
                }),
                Scene: {
                    Statuses: new dojo.data.ItemFileReadStore({
                        data: {
                            label: "name",
                            identifier: "name",
                            items: formatHandler.GetSceneStatuses()
                        }
                    }),
                    Structures: new dojo.data.ItemFileReadStore({
                        data: {
                            label: "name",
                            identifier: "name",
                            items: formatHandler.GetSceneStructures()
                        }
                    }),
                    Importances: new dojo.data.ItemFileReadStore({
                        data: {
                            label: "name",
                            identifier: "name",
                            items: formatHandler.GetSceneImportances()
                        }
                    }),
                    Ratings: formatHandler.GetSceneRatings()
                
                },
                Person: {
                    Roles: new dojo.data.ItemFileReadStore({
                        data: {
                            label: "name",
                            identifier: "name",
                            items: formatHandler.GetPersonRoles()
                        }
                    }),
                    Importances: new dojo.data.ItemFileReadStore({
                        data: {
                            label: "name",
                            identifier: "name",
                            items: formatHandler.GetPersonImportances()
                        }
                    }),
                    Ratings: formatHandler.GetPersonRatings()
                
                }
            }
            this.InterfaceSettings = formatHandler.GetInterfaceSettings();
            
			this.History.deserialize(formatHandler.GetHistory());
			
            // assign the project data here.
            // Have to jump through some hoops to 'refresh' the data.
            this.ProjectStore.clearOnClose = true;
            // NOTE: The following fixes a bug similar to http://bugs.dojotoolkit.org/ticket/11666,
            // except that that one is fixed, and this one takes place in fetchItemByIdentity.
            // TODO: Let them know about this bug.
            if (!this.ProjectStore._loadFinished) {
                this.ProjectStore._jsonData = null;
            }
            this.ProjectStore.data = this._createProjectData(formatHandler.GetEntities());
            this.ProjectStore.close();
            
            this.isOpen = true;
            this.onEndLoad(this);
            return true;
        } catch (e) {
            this.isOpen = false;
            this.ReadOnly = true;
            this.onLoadError(e);
            throw e;
        }
        
    },
    
    CreateCLOB: function() {
        return my.ProjectData.CreateDataUID();
    },
    
    GetCLOB: function(clobID) {
        this._assertIsOpen();
        if (!this._handler) {
            throw "Project has no associated file.";
        }
        return this._handler.loadCLOB(clobID);
    },
    
    UpdateCLOB: function(clobID, newData) {
        this._assertIsOpen();
        if (this.ReadOnly) {
            throw "Project is Read Only!";
        }
        if (!this._handler) {
            throw "Project has no associated file.";
        }
        var result = this._handler.updateCLOB(clobID, newData);
        result.then(dojo.hitch(this, function() {
            this.onCLOBChange(clobID, newData);
        }));
        return result;
    },
    
    onCLOBChange: function(id, newData) {
        // stub function for other objects to connect to.
    },
    
    LoadProject: function(uriString, mightBeNew, forceReadOnly) {
        var result = new dojo.Deferred();
        // NOTE: This replaces everything. Make sure you save first.
        try {
            var handler = this._createIOHandler(uriString);
            if (!handler) {
                throw "Unimplemented: Can't retrieve project data from " + uriString;
            }
            var me = this;
            handler.load(mightBeNew &&
            function(name) {
                return me._createNewProject(name)
            }).then(function(formatHandler) {
                me._handler = handler;
                try {
                    me._LoadProject.apply(me, [formatHandler, forceReadOnly]);
                    result.callback();
                } catch (e) {
                    result.errback(e);
                }
            }, function(e) {
                result.errback(e);
            });
            
        } catch (e) {
            result.errback(e);
        }
        return result;
    },
    
    IsDirty: function() {
        return this.isDirty || this.ProjectStore.isDirty();
    },
    
    onBeginLoad: function() {
        // stub function for other objects to connect to.
    },
    
    onEndLoad: function() {
        // stub function for other objects to connect to.
    },
    
    onLoadError: function(e) {
        // stub function for other objects to connect to.
    
    },
    
    onTitleChange: function(title) {
        // stub function for other objects to connect to.
    },
    
    onDirtyChange: function() {
        // stub function for other objects to connect to.
    
    },
    
    onBeginSave: function() {
        // stub function for other objects to connect to.
    },
    
    onEndSave: function() {
        // stub function for other objects to connect to.
    },
    
    onSaveError: function() {
        // stub function for other objects to connect to.
    }
    
});

my.ProjectData.CreateDataUID = function() {
	// NOTE: This requires Math.uuid.js.
	return Math.uuid(10);
}
    


/*
 *
 formatHandler.IsReadOnly();
 formatHandler.GetSceneStatuses()
 formatHandler.GetSceneStructures()
 formatHandler.GetSceneImportances()
 formatHandler.GetSceneRatings()
 formatHandler.GetPersonRoles()
 formatHandler.GetPersonImportances()
 formatHandler.GetPersonRatings()
 formatHandler.GetInterfaceSettings();
 formatHandler.GetEntities();
 */
// initialize the drivers array.
my.ProjectData.Drivers = {
	
    //JSONFormatString: ApplicationInfo.ID + "-1.0",
	CurrentVersion: "story-steward-1.1",
    
    _writeStandardJSONFormat: function(dataReader,validate) {
        var result = new dojo.Deferred();
        try {
        
			var fixUp = function(data) {
				if (data.type) {
					data.created = fixUp.dateTime(data.created);
					data.modified = fixUp.dateTime(data.modified);
					if (data.tags) {
						data.tags = fixUp.tags(data.tags);
					}
					if (fixUp[data.type]) {
						fixUp[data.type](data);
					}
				}
				return data;
			}
			
			fixUp.tags = function(data) {
				if (!dojo.isArray(data)) {
					return [data];
				}
				return data;
			}
			
			fixUp.dateTime = function(data) {
				return data._value;
			}
			
			fixUp.date = function(data) {
				return data._value.substr(0, data._value.indexOf("T"));
			}
			
			fixUp.project = function(data) {
				if (data.credits && !dojo.isArray(data.credits)) {
					data.credits = [data.credits];
				}
				dojo.forEach(data.credits || [], fixUp);
			}
			
			fixUp.uidReference = function(data) {
				// if this is a reference already, then return it
				// otherwise, return the uid itself.
				if (data._referencee) {
					return data._reference;
				} else if (data.uid) {
					return data.uid;
				}
			}
			
			fixUp.content = function(data) {
				if (data.credits && !dojo.isArray(data.credits)) {
					data.credits = [data.credits];
				}
				dojo.forEach(data.credits || [], fixUp);
				if (data.content && !dojo.isArray(data.content)) {
					data.content = [data.content];
				}
				dojo.forEach(data.content || [], fixUp);
				if (data.subtype == "scene") {
					if (data.viewpoint) {
						data.viewpoint = fixUp.uidReference(data.viewpoint);
					}
					if (data.setting) {
						data.setting = fixUp.uidReference(data.setting);
					}
					if (data.people) {
						data.people = dojo.map(data.people, fixUp.uidReference);
					}
					if (data.places) {
						data.places = dojo.map(data.places, fixUp.uidReference);
					}
					if (data.things) {
						data.things = dojo.map(data.things, fixUp.uidReference);
					}
					if (data.ratings) {
						if (data.rating0 || data.rating1 || data.rating2 || data.rating3) {
							data.ratings = [];
							dojo.forEach([0, 1, 2, 3], function(num) {
								data.ratings[num] = data["rating" + num] || 0;
								delete data["rating" + num];
							})
						}
					}
				}
				// The format no longer uses subtype, as it has a
				// full inheritance system in the schema.
				data.type = data.subtype;
				delete data.subtype;
			}
			
			fixUp.journal = function(data) {
				data.posted = fixUp.dateTime(data.posted);
			}
			
			fixUp.note = function(data) {
				if (data.subnotes && !dojo.isArray(data.subnotes)) {
					data.subnotes = [data.subnotes];
				}
				dojo.forEach(data.subnotes || [], fixUp);
			}
			
			fixUp.person = function(data) {
				if (data.ratings) {
					if (data.rating0 || data.rating1 || data.rating2 || data.rating3) {
						data.ratings = [];
						dojo.forEach([0, 1, 2, 3], function(num) {
							data.ratings[num] = data["rating" + num] || 0;
							delete data["rating" + num];
						})
					}
				}
			}
			
			fixUp.goal = function(data) {
				if (data.starting) {
					data.starting = fixUp.date(data.starting);
				}
				if (!data.starting) {
					delete data.starting;
				}
				if (data.ending) {
					data.ending = fixUp.date(data.ending);
				}
				if (!data.ending) {
					delete data.ending;
				}
				if (data.where) {
					data.where = fixUp.uidReference(data.where);
				}
				if (!data.targetCount) {
					// this can be NaN if the user left a blank in the numbertextbox. 
					delete data.targetCount;
				}
			}
			
			fixUp.task = function(data) {
				if (data.starting) {
					data.starting = fixUp.date(data.starting);
				}
				if (data.starting === null) {
					delete data.starting;
				}
				if (data.due) {
					data.due = fixUp.date(data.due);
				}
				if (data.due === null) {
					delete data.due;
				}
				if (data.completed) {
					data.completed = fixUp.date(data.completed);
				}
				if (data.completed === null) {
					delete data.completed;
				}
			}
			
			fixUp.lookup = function(data) {
				return data.name;
			}
            
						
            var content = [];
            var notes = [];
            var work = [];
            var project = null;
            var entities = dataReader.GetEntities();
			dojo.forEach(dataReader.GetEntities(),function(entity) {
				fixUp(entity);
				switch (entity.type) {
					case "scene":
					case "chapter":
					case "part":
					case "book":
						content.push(entity);
						break;
					case "note":
					case "person":
					case "place":
					case "thing":
					    notes.push(entity);
						break;
					case "journal":
					case "goal":
					case "task":
					    work.push(entity);
						break;
					case "project":
					    if (project) {
							throw "Two projects found while saving!";
						}
					    project = entity;
						break;
				}
			})
            var rawData = project;
            rawData.format = my.ProjectData.Drivers.CurrentVersion;
            rawData.content = content;
            rawData.notes = notes;
            rawData.work = work;
			
			rawData.history = dataReader.GetHistory();
            
            rawData.interfaceSettings = dataReader.GetInterfaceSettings();
            
            rawData.customizations = {
                scene: {
                    statuses: [],
                    structures: [],
                    importances: [],
                    ratings: []
                },
                person: {
                    roles: [],
                    importances: [],
                    ratings: []
                }
            }
            
            
            var deferreds = [dataReader.GetTags().then(function(arr) {
                rawData.customizations.tags = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetSceneStatuses().then(function(arr) {
                rawData.customizations.scene.statuses = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetSceneStructures().then(function(arr) {
                rawData.customizations.scene.structures = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetSceneImportances().then(function(arr) {
                rawData.customizations.scene.importances = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetSceneRatings().then(function(arr) {
                rawData.customizations.scene.ratings = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetPersonRoles().then(function(arr) {
                rawData.customizations.person.roles = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetPersonImportances().then(function(arr) {
                rawData.customizations.person.importances = dojo.map(arr, fixUp.lookup);
            }), dataReader.GetPersonRatings().then(function(arr) {
                rawData.customizations.person.ratings = dojo.map(arr, fixUp.lookup);
            })];
            var list = new dojo.DeferredList(deferreds);
            list.then(function() {
				try {
					if (validate !== false) {
						var validation = my.schemas.ProjectDataValidator.validate(rawData, my.schemas.ProjectDataValidator.versions[my.ProjectData.Drivers.CurrentVersion]);
						if (validation.valid) {
							result.callback(rawData);
						} else {
							// NOTE: This shouldn't happen if we're doing things correctly,
							// but this makes it idiot-proof.
							var msg = "A valid project file could not be produced\n\n" +
							"Details:\n-------\n";
							for (var i = 0; i < validation.errors.length; i++) {
								msg += validation.errors[i].property + " " + validation.errors[i].message + "\n";
							}
							result.errback(msg);
						}
					} else {
						result.callback(rawData);
					}
				} catch (ex) {
					result.errback(ex);
				}
            }, function(ex) {
                result.errback(ex);
            })
        } catch (ex) {
            result.errback(ex);
        }
        
        return result;
    },
    
    _readStandardJSONFormat: function(rawData, readOnly) {
		var validation = my.schemas.ProjectDataValidator.validate(rawData);
		if (validation.valid) {
			if (validation.format != my.schemas.ProjectDataValidator.versions[my.ProjectData.Drivers.CurrentVersion]) {
				// NOTE: Yes, I'm uncomfortable with this UI decision, but it seems like I should do something and I 
				// don't want to spend too long trying to figure out a better way.
				if (confirm("Your project was created with an earlier version of Story Steward.\nNo data should be lost while converting to the new format, but you may want to make a backup first.\nDo you want to convert the file now?")) {
					if (!my.schemas.ProjectDataValidator.convert(validation.format, my.schemas.ProjectDataValidator.versions[my.ProjectData.Drivers.CurrentVersion], rawData)) {
						throw "File format is not supported (" + my.schemas.ProjectDataValidator.getVersionInfoString(validation.format) + ")";
					}
				} else {
					throw "User cancelled conversion request."
				}
			}
			
			var fixUp = function(data) {
				if (data.type) {
					data.created = fixUp.dateTime(data.created);
					data.modified = fixUp.dateTime(data.modified);
					if (fixUp[data.type]) {
						fixUp[data.type](data);
					}
				}
				return data;
			}
			
			fixUp.dateTime = function(data) {
				return {
					_type: "Date",
					_value: data
				}
			}
			
			fixUp.project = function(data) {
				dojo.forEach(data.credits || [], fixUp);
			}
			
			fixUp.uidReference = function(data) {
				return {
					_reference: data
				}
			}
			
			fixUp.scene = fixUp.chapter = fixUp.part = fixUp.book = function(data) {
				data.subtype = data.type;
				data.type = "content";
				fixUp.content(data);
			}
			
			fixUp.content = function(data) {
				dojo.forEach(data.credits || [], fixUp);
				dojo.forEach(data.content || [], fixUp);
				if (data.subtype == "scene") {
					if (data.viewpoint) {
						data.viewpoint = fixUp.uidReference(data.viewpoint);
					}
					if (data.setting) {
						data.setting = fixUp.uidReference(data.setting);
					}
					if (data.people) {
						data.people = dojo.map(data.people, fixUp.uidReference);
					}
					if (data.places) {
						data.places = dojo.map(data.places, fixUp.uidReference);
					}
					if (data.things) {
						data.things = dojo.map(data.things, fixUp.uidReference);
					}
					if (data.ratings) {
						dojo.forEach(data.ratings, function(rating, i) {
							data["rating" + i] = rating;
						})
						delete data.ratings;
					}
				}
			}
			
			fixUp.journal = function(data) {
				data.posted = fixUp.dateTime(data.posted);
			}
			
			fixUp.note = function(data) {
				dojo.forEach(data.subnotes || [], fixUp);
			}
			
			fixUp.person = function(data) {
				if (data.ratings) {
					dojo.forEach(data.ratings, function(rating, i) {
						data["rating" + i] = rating;
					})
					delete data.ratings;
				}
				
			}
			
			fixUp.goal = function(data) {
				if (data.starting) {
					data.starting = fixUp.dateTime(data.starting);
				}
				if (data.ending) {
					data.ending = fixUp.dateTime(data.ending);
				}
				if (data.where) {
					data.where = fixUp.uidReference(data.where);
				}
			}
			
			fixUp.task = function(data) {
				if (data.starting) {
					data.starting = fixUp.dateTime(data.starting);
				}
				if (data.due) {
					data.due = fixUp.dateTime(data.due);
				}
				if (data.completed) {
					data.completed = fixUp.dateTime(data.completed);
				}
			}
			
			fixUp.lookup = function(data) {
				return {
					name: data
				};
			}
			
			
			var entities = [];
			entities.push.apply(entities, dojo.map(rawData.content || [], fixUp));
			delete rawData.content;
			entities.push.apply(entities, dojo.map(rawData.notes || [], fixUp));
			delete rawData.notes;
			entities.push.apply(entities, dojo.map(rawData.work || [], fixUp));
			delete rawData.work;
			
			var history = rawData.history;
			delete rawData.history;
			
			var customizations = rawData.customizations || {};
			delete rawData.customizations;
			var interfaceSettings = rawData.interfaceSettings || {};
			delete rawData.interfaceSettings;
			
			// The 'project' entity is the base of the format.
			entities.push(fixUp(rawData));
			
			return {
				IsReadOnly: function() {
					return readOnly;
				},
				GetTags: function() {
					return dojo.map(customizations.tags || [], fixUp.lookup);
				},
				GetSceneStatuses: function() {
					return dojo.map((customizations.scene && customizations.scene.statuses) || [], fixUp.lookup)
				},
				GetSceneStructures: function() {
					return dojo.map((customizations.scene && customizations.scene.structures) || [], fixUp.lookup)
					
				},
				GetSceneImportances: function() {
					return dojo.map((customizations.scene && customizations.scene.importances) || [], fixUp.lookup)
					
				},
				GetSceneRatings: function() {
					return dojo.map((customizations.scene && customizations.scene.ratings) || [], fixUp.lookup)
					
				},
				GetPersonRoles: function() {
					return dojo.map((customizations.person && customizations.person.roles) || [], fixUp.lookup)
					
				},
				GetPersonImportances: function() {
					return dojo.map((customizations.person && customizations.person.importances) || [], fixUp.lookup)
					
				},
				GetPersonRatings: function() {
					return dojo.map((customizations.person && customizations.person.ratings) || [], fixUp.lookup)
					
				},
				GetInterfaceSettings: function() {
					return interfaceSettings;
				},
				GetEntities: function() {
					return entities;
				},
				GetHistory: function() {
					return history;
				}
			}
		} else {
			var msg = "Project file is not an appropriate format\n\n" +
			"Details:\n-------\n";
			for (var i = 0; i < validation.errors.length; i++) {
				msg += validation.errors[i].property + " " + validation.errors[i].message + "\n";
			}
			throw msg;
		}
	},
    
    _getStandardURIs: function(uriString) {
        var result = {};
        result.projectURI = uriString;
        var fileIndex = uriString.lastIndexOf('/') + 1;
        var extIndex = uriString.lastIndexOf('.');
        if (extIndex < fileIndex) {
            extIndex = uriString.length;
        }
        result.lockURI = uriString.substring(0, extIndex) + ".lock";
        result.clobPathURI = uriString.substring(0, extIndex) + ".contents/";
        result.backupPathURI = uriString.substring(0, extIndex) + ".backup/";
        result.fileName = result.projectURI.substring(fileIndex, extIndex);
        result.getCLOBURI = function(CLOBid) {
            return this.clobPathURI + CLOBid + ".htm";
        }
        result.getBackupURI = function(backupName, backupNum, CLOBid) {
            if (CLOBid) {
                return this.backupPathURI + CLOBid + "." + backupName + "." + backupNum + ".htm";
            }
            return this.backupPathURI + "project." + backupName + "." + backupNum + ".json";
        }
        return result;
    },
    
    file: function(uriString, ProjectData, logCallback) {
    
        var FileIOHandler = function(uriString, httpFallback) {
        
            var fallback = false;
            var paths = my.ProjectData.Drivers._getStandardURIs(uriString);
            
            var backupMax = 9;
            
            var backupState = {
                session: true,
                count: 0,
                clobStates: {},
                getClobState: function(id) {
                    if (!this.clobStates[id]) {
                        this.clobStates[id] = {
                            session: true,
                            count: 0
                        }
                    }
                    return this.clobStates[id];
                }
            }
			
			this.displayMessage = function(message) {
				// NOTE: Just an event to connect to.
			}
            
            this._backup = function(CLOBid) {
                var result = new dojo.Deferred();
                var me = this;
                var lfa = my.LocalFileAccess;
                var state = CLOBid ? backupState.getClobState(CLOBid) : backupState;
                var copy = function(fromUri, toUri, completed) {
                    var from = lfa.convertUriToLocalPath(fromUri);
                    var to = lfa.convertUriToLocalPath(toUri);
                    try {
                         lfa.copy(to, from, completed, function(ex) {
                            me.log("Error backing up file [" + from + "] to [" + to + "]: " + ex);
                            // don't do anything else, I want to let them try to save.
                            completed();
                        });
                    } catch (ex) {
                        me.log("Error backing up file [" + from + "] to [" + to + "]: " + ex);
                        // don't do anything else, I want to let them try to save.
                        completed();
                    }
                }
                var doBackup = function(baseUri, backupName, completed) {
                    var last = paths.getBackupURI(backupName, backupMax, CLOBid);
                    var toFile;
                    var fromFile;
                    
                    var backupClosure = function(level) {
                        if (level >= 0) {
                            toFile = fromFile || last;
                            fromFile = paths.getBackupURI(backupName, level, CLOBid);
                            copy(fromFile, toFile, function() {
                                backupClosure(level-1);
                            });
                        } else {
                            toFile = fromFile;
                            fromFile = baseUri;
                            copy(fromFile,toFile,function() {
                                completed(last);
                            });
                        }
                    }

                    // NOTE: Yes, I want to do -1, since the last one is simply going to get overwritten.
                    backupClosure(backupMax - 1);
                    
                    /*for (var i = backupMax - 1; i >= 0; i--) {
                        toFile = fromFile || last;
                        fromFile = paths.getBackupURI(backupName, i, CLOBid);
                        copy(fromFile, toFile);
                    }
                    toFile = fromFile;
                    fromFile = baseUri;
                    copy(fromFile, toFile);
                    return last;*/
                }
                
                var baseUri = CLOBid ? paths.getCLOBURI(CLOBid) : paths.projectURI;
                var processAllBackups = function(completed) {
                    if (state.session) {
                        doBackup(baseUri,"everySession",function() {
                            state.session = false;
                            processAllBackups(completed);
                        });
                    } else {
                        doBackup(baseUri, "everySave", function(everySave) {
                            if ((state.count % 10) === 0) {
                                doBackup(everySave,"every10thSave",function(every10thSave) {
                                    if ((state.count % 100) === 0) {
                                        doBackup(every10thSave,"every100thSave",function() {
                                            completed();
                                        });
                                    } else {
                                        completed();
                                    }
                                });
                            } else {
                                completed();
                            }
                        });
                    }
                }
                
                processAllBackups(function() {
                    state.count += 1;
                    result.callback();
                });
                
                /*if (state.session) {
                    doBackup(baseUri, "everySession");
                    state.session = false;
                }
                var everySave = doBackup(baseUri, "everySave");
                if ((state.count % 10) === 0) {
                    var every10thSave = doBackup(everySave, "every10thSave");
                    if ((state.count % 100) === 0) {
                        doBackup(every10thSave, "every100thSave");
                    }
                }
                state.count++;*/
                
                return result;
            }
			
			this.getUri = function() {
				return paths.projectURI;
			}
			
			this.log = function(msg) {
				console.log(msg);
				if (logCallback) {
					logCallback(msg);
				}
			}
            
            // FUTURE: Possibly, set per-file permissions: http://www.mozilla.org/projects/security/components/per-file.html
            this.load = function(createNew) {
                //    If the application is on a file URL, then I can assume I
                //    *might* be able to get local file access and xdomain access.
                //    If it's not, then there's probably no way it will happen,
                //    although an advanced user may set some sort of advanced security
                //    privilege for a specific trusted site, so he can get it to work.
                // 1) If file is at a local file URI, then try to use
                //    TiddlyWiki method to 'save' a lock file and then
                //    load the file. If everything happens okay, then
                //    we can load the project data as writeable.
                // 2) If that fails, fallback to http, which uses xhrGet.
                if (my.LocalFileAccess) {
                    var result = new dojo.Deferred();
                    // first, try to 'save' the lock file. If this raises an
                    // error, then we're falling back to http.
                    my.LocalFileAccess.save(my.LocalFileAccess.convertUriToLocalPath(paths.lockURI), new Date().toString(),function() {
                        // if we can save, then we can load. From now on, any errors do not fall
                        // back to http anymore.
                        try {
                            projectFile = my.LocalFileAccess.convertUriToLocalPath(paths.projectURI);
                            var data;
                            var content;
                            my.LocalFileAccess.load(projectFile,function(content) {
                                if (content) {
                                    var rawData = dojo.fromJson(content);
                                    data = my.ProjectData.Drivers._readStandardJSONFormat(rawData, false);
                                } else if (createNew) {
                                    data = createNew(paths.fileName);
                                } else {
                                    result.errback("Can't find file at " + projectFile);
                                    return;
                                }
                                result.callback(data);
                            },function(e) {
                                if (createNew) {
                                    data = createNew(paths.fileName);
                                    result.callback(data);
                                } else {
                                    throw e;
                                }
                            });
                        } catch (e) {
                            result.errback(e);
                        }
                    },function(e) {
                        // can't load, so fallback to xhrGet.
                        alert("Error loading file, falling back to http access: " + e);
                        fallback = true;
                        dojo.when(httpFallback.load(),function(data) {
                            result.callback(data);
                        },function(e) {
                            result.errback(e);
                        });
                    });
                    return result;
                } else {
                    // can't load, so fallback to xhrGet.
                    alert("Local file access is not available, falling back to http access.");
                    fallback = true;
                    return httpFallback.load();
                }
            }
            
            this.loadCLOB = function(id) {
                if (fallback) {
                    return httpFallback.loadCLOB(id);
                } else {
                    var result = new dojo.Deferred();
                    try {
                        contentFile = my.LocalFileAccess.convertUriToLocalPath(paths.getCLOBURI(id));
                        my.LocalFileAccess.load(contentFile,function(content) {
                            if (content) {
                                result.callback(content);
                            } else {
                                result.errback("Can't find file at " + contentFile);
                            }
                        },function(e) {
                            result.errback(e);
                        });
                    } catch (e) {
                        result.errback(e);
                    }
                    return result;
                    
                }
                
            }
            
            this.updateCLOB = function(id, value) {
                var result = new dojo.Deferred();
                try {
                    if (!fallback) {
                        dojo.when(this._backup(id),function() {
                            contentFile = my.LocalFileAccess.convertUriToLocalPath(paths.getCLOBURI(id));
                            my.LocalFileAccess.save(contentFile, value, function() {
                                result.callback();
                            },function(e) {
                                result.errback(e);
                            });
                        },function(ex) {
                            result.errback(ex);
                        });
                    } else {
                        result.errback("Can't POST to local file.");
                    }
                } catch (ex) {
                    result.errback(ex);
                }
                return result;
            }
            
            this.save = function(dataReader) {
                var result = new dojo.Deferred();
                try {
                    if (!fallback) {
                        dojo.when(this._backup(),function() {
                            my.ProjectData.Drivers._writeStandardJSONFormat(dataReader).then(function(rawData) {
                                var content = dojo.toJson(rawData, true);
                                var projectFile = my.LocalFileAccess.convertUriToLocalPath(paths.projectURI);
                                my.LocalFileAccess.save(projectFile, content, function() {
                                    result.callback();
                                }, function(e) {
                                    result.errback(e);
                                });
                            }, function(ex) {
                                result.errback(ex);
                            });
                        },function(ex) {
                            result.errback(ex);
                        });
                    } else {
                        result.errback("Can't POST to local file.");
                    }
                } catch (ex) {
                    result.errback(ex);
                }
                return result;
            }
            
        }
        return new FileIOHandler(uriString, my.ProjectData.Drivers.http(uriString, ProjectData));
        
    },
    
    http: function(uriString, ProjectData, logCallback) {
    
    
        var paths = my.ProjectData.Drivers._getStandardURIs(uriString);
        
        
        var HttpIOHandler = function(uriString, httpFallback) {
        
			this.getUri = function() {
				return paths.projectURI;
			}
            
			this.log = function(msg) {
				console.log(msg);
				if (logCallback) {
					logCallback(msg);
				}
			}
            
            this.load = function() {
                // FUTURE: Need some way of specifying user and password if
                // the site implements security. I'd like to do a 'fallback'
                // where I get a status which indicates this and then ask
                // for the user and password, but it'd also be nice to be
                // able to pre-specify it.
                var xhr = dojo.xhrGet({
                    url: paths.projectURI,
                    handleAs: "json",
                    preventCache: true
                });
                var result = new dojo.Deferred(function() {
                    xhr.cancel();
                });
                xhr.then(function(content) {
                    try {
                        var data = my.ProjectData.Drivers._readStandardJSONFormat(content, true);
                        result.callback(data);
                    } catch (e) {
                        result.errback(e);
                    }
                }, function(err) {
                    result.errback(err);
                })
                return result;
            }
            
            this.loadCLOB = function(id) {
                return dojo.xhrGet({
                    url: paths.getCLOBURI(id),
                    handleAs: "text",
                    preventCache: true
                });
                
            }
            
            
        }
        return new HttpIOHandler(uriString);
        
    },
    
    
    sample: function(uriString, ProjectData, logCallback) {
        var SampleDatabases = {
            TheDarkHorizon: function(readOnly) {
                var now = new Date(); // for creating UID's.
                var today = new Date(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),0,0,0,0);
				
				var bookId = my.ProjectData.CreateDataUID();
				var booksAndParts = {};
				booksAndParts[bookId] = {
					chapters: 0,
					statuses: {
						draft: {
							scenes: 1,
							words: 350
						}
					}
				}
                var result = {
                    IsReadOnly: function() {
                        return readOnly;
                    },
					GetHistory: function() {
						return [{
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -44)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 1980,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -43)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 2924,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -42)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 4954,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -41)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 5817,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -40)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 8167,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -39)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 8795,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -38)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 12004,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -37)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 13185,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -36)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 14215,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -35)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 17174,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -34)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 20108,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -33)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 21140,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -32)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 23951,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -31)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 24367,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -30)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 27185,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -29)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 29385,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -28)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 32044,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -27)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 34072,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -26)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 34264,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -25)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 35168,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -24)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 36426,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -23)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 39311,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -22)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 40925,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -21)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 40925,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -20)),
							"noBookOrPart": {
								"noStatus": {
									"words": 0,
									"scenes": 0
								},
								"statuses": {
									"draft": {
										"words": 42431,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -19)),
							"noBookOrPart": {
								"noStatus": {
									"words": 0,
									"scenes": 0
								},
								"statuses": {
									"draft": {
										"words": 42962,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -18)),
							"noBookOrPart": {
								"noStatus": {
									"words": 0,
									"scenes": 0
								},
								"statuses": {
									"draft": {
										"words": 47307,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -17)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 49127,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -16)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 52807,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -15)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 52884,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -14)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 52884,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -13)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 56802,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -12)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 58822,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -11)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 61435,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -10)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 64086,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -9)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 65477,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -8)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 65921,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -7)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 65908,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -6)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 67149,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -5)),
							"noBookOrPart": {
								"statuses": {
									"draft": {
										"words": 70414,
										"scenes": 0
									}
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -4)),
							"noBookOrPart": {
								"noStatus": {
									"words": 72715,
									"scenes": 0
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -3)),
							"noBookOrPart": {
								"noStatus": {
									"words": 72715,
									"scenes": 0
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -2)),
							"noBookOrPart": {
								"chapters": 32,
								"noStatus": {
									"words": 117432,
									"scenes": 117
								}
							}
						}, {
							"uid": my.ProjectData.CreateDataUID(),
							"when": dojo.date.stamp.toISOString(dojo.date.add(today, "day", -1)),
							"noBookOrPart": {
								"chapters": 32,
								"noStatus": {
									"words": 117432,
									"scenes": 117
								}
							}
						}];
					},
                    GetEntities: function() {
                        return [{
							created: now,
							modified: now,
							type: "project",
							uid: "project",
							name: "Branch by Nigel",
							description: "<p>A monumental foray into the desparate realms of cross-platform software development using HTML and JavaScript.</p>",
							credits: [{
								uid: my.ProjectData.CreateDataUID(),
								type: "credit",
								created: now,
								modified: now,
								name: "Neil M. Sheldon",
								biography: "<p>Stunted by unprofessionalism, Neil has yet to publish a single word.</p>",
								role: "Author"
							}]
						}, {
                            uid: my.ProjectData.CreateDataUID(),
                            name: "The Dark Horizon...",
                            type: "content",
                            subtype: "book",
                            created: now,
                            modified: now,
                            tags: [],
                            content: [{
                                uid: my.ProjectData.CreateDataUID(),
                                created: now,
                                modified: now,
                                type: "content",
                                subtype: "scene",
                                name: "Foreword",
                                description: "<p>Introduction to the book</p>",
                                text: ProjectData.CreateCLOB(),
                                tags: []
                            }, {
                                uid: my.ProjectData.CreateDataUID(),
                                name: "...And the brightness beyond.",
                                created: now,
                                modified: now,
                                type: "content",
                                subtype: "part",
                                tags: [],
                                content: [{
                                    uid: my.ProjectData.CreateDataUID(),
                                    created: now,
                                    modified: now,
                                    type: "content",
                                    subtype: "chapter",
                                    name: "And thus, it happened...",
                                    description: "<p>In which our hero begins his journey and destroys the chalice.</p>",
                                    tags: [],
                                    content: [{
                                        uid: my.ProjectData.CreateDataUID(),
                                        created: now,
                                        modified: now,
                                        type: "content",
                                        subtype: "scene",
                                        name: "It was a Dark and Really Stormy Night",
                                        description: "<p>Our hero meets a dark stranger.</p>",
                                        text: ProjectData.CreateCLOB(),
                                        lastWordCount: 350,
                                        tags: []
                                    },{
                                        uid: my.ProjectData.CreateDataUID(),
                                        created: now,
                                        modified: now,
                                        type: "content",
                                        subtype: "scene",
                                        name: "And then they all died",
                                        description: "<p>Yes, they really did.</p>",
                                        text: ProjectData.CreateCLOB(),
                                        tags: []
                                    }]
                                
                                }]
                            }, {
                                uid: my.ProjectData.CreateDataUID(),
                                created: now,
                                modified: now,
                                type: "content",
                                subtype: "scene",
                                name: "Epilogue",
                                description: "<p>My only friend, the end.</p>",
                                text: ProjectData.CreateCLOB(),
                                tags: []
                            }]
                        }, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "note",
                            created: now,
                            modified: now,
                            tags: [],
                            name: "Here's the Truth about the Island."
                        
                        }, {
							uid: my.ProjectData.CreateDataUID(),
							type: "goal",
							created: now,
							modified: now,
							name: "Ancient Deadline",
							what: "words",
							starting: dojo.date.add(today, "day", -90),
							ending: dojo.date.add(today, "day", -80),
							targetCount: 500
						}, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "goal",
                            created: now,
                            modified: now,
                            name: "Old Deadline",
							what: "words",
                            starting: dojo.date.add(today, "day", -50),
                            ending: dojo.date.add(today, "day", -40),
                            targetCount: 9000
                        }, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "goal",
                            created: now,
                            modified: now,
                            name: "Recent Deadline",
							what: "words",
                            starting: dojo.date.add(today, "day", -25),
                            ending: dojo.date.add(today, "day", -15),
                            targetCount: 50000
                        }, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "goal",
                            created: now,
                            modified: now,
                            name: "Current Deadline",
							what: "words",
                            starting: dojo.date.add(today, "day", -5),
                            ending: dojo.date.add(today, "day", 5),
                            targetCount: 200000
                        }, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "goal",
                            created: now,
                            modified: now,
                            name: "Future Deadline",
							what: "words",
                            starting: dojo.date.add(today, "day", 5),
                            ending: dojo.date.add(today, "day", 15),
                            targetCount: 500000
                        }, {
                            uid: my.ProjectData.CreateDataUID(),
                            type: "goal",
                            created: now,
                            modified: now,
                            name: "Ongoing Deadline",
							what: "words",
                            starting: dojo.date.add(today, "day", -60),
                            ending: dojo.date.add(today, "day", 30),
                            targetCount: 150000
                        }]
                    },
                    GetTags: function() {
                        return [{
                            name: "animal"
                        }, {
                            name: "vegetable"
                        }, {
                            name: "mineral"
                        }]
                    },
                    GetSceneStatuses: function() {
                        return [{
                            name: "draft"
                        }, {
                            name: "reviewed"
                        }, {
                            name: "ready"
                        }]
                    },
                    GetSceneStructures: function() {
                        return [{
                            name: "action"
                        }, {
                            name: "reaction"
                        }]
                    },
                    GetSceneImportances: function() {
                        return [{
                            name: "plot"
                        }, {
                            name: "subplot"
                        }, {
                            name: "exposition"
                        }]
                    },
                    GetSceneRatings: function() {
                        return [{
                            name: "wordiness"
                        }, {
                            name: "quality"
                        }, {
                            name: "action"
                        }, {
                            name: "beauty"
                        }];
                    },
                    GetPersonRoles: function() {
                        return [{
                            name: "protagonist"
                        }, {
                            name: "antagonist"
                        }, {
                            name: "bystander"
                        }, {
                            name: "noncommitted"
                        }];
                    },
                    GetPersonImportances: function() {
                        return [{
                            name: "major"
                        }, {
                            name: "supporting"
                        }, {
                            name: "minor"
                        }]
                    },
                    GetPersonRatings: function() {
                        return [{
                            name: "depth"
                        }, {
                            name: "realism"
                        }, {
                            name: "sympathy"
                        }, {
                            name: "likeability"
                        }]
                    },
                    GetInterfaceSettings: function() {
                        return {};
                    }
                }
                return result;
                
            }
        }
        
        var SampleIOHandler = function(databaseName, readonly) {
        
			this.log = function(msg) {
				console.log(msg);
				if (logCallback) {
					logCallback(msg);
				}
			}
            
			this.getUri = function() {
				return uriString;
			}
            
            this.load = function() {
                var result = new dojo.Deferred();
                if (SampleDatabases.hasOwnProperty(databaseName)) {
                    var data;
                    try {
                        data = SampleDatabases[databaseName](readonly);
                    } catch (e) {
                        result.errback(e);
                        return result;
                    }
                    this._CLOBData = {};
                    result.callback(data);
                } else {
                    result.errback("Unknown Sample Database Name: " + databaseName);
                }
                return result;
            };
            this._CLOBData = {};
            
            this.loadCLOB = function(id) {
                var result = new dojo.Deferred();
                if (!this._CLOBData[id]) {
                    this._CLOBData[id] = "<p>" +
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
                    "Nullam mauris nibh, suscipit sed euismod auctor, tempus at " +
                    "dolor. Phasellus tempus condimentum massa id placerat. Morbi " +
                    "sollicitudin ante vitae lorem sagittis non posuere lorem " +
                    "pellentesque. Sed lacus massa, hendrerit ut blandit nec, " +
                    "elementum condimentum nisi. Nam neque urna, venenatis non " +
                    "vehicula ut, imperdiet nec neque. Suspendisse potenti. Proin " +
                    "cursus sapien quis nibh viverra commodo. Proin rhoncus lacus " +
                    "vel nunc tempus porta. Duis in sem lacus. Sed ullamcorper " +
                    "bibendum lorem, at blandit quam suscipit eleifend. Pellentesque " +
                    "habitant morbi tristique senectus et netus et malesuada fames ac " +
                    "turpis egestas. Cras pharetra justo sit amet lacus imperdiet ut " +
                    "gravida mi placerat. Donec tempus consequat facilisis. Aliquam ut " +
                    "pretium dolor. Quisque volutpat dignissim eros id bibendum. Lorem " +
                    "ipsum dolor sit amet, consectetur adipiscing elit. Ut at mattis neque." +
                    "</p>" +
                    "<p>" +
                    "Aliquam auctor suscipit nisi vitae scelerisque. Cum sociis natoque " +
                    "penatibus et magnis dis parturient montes, nascetur ridiculus mus. " +
                    "Cras hendrerit dolor vel arcu molestie eu rutrum leo lacinia. Ut cursus, " +
                    "tortor ut aliquet ullamcorper, metus risus sagittis elit, a mattis sem " +
                    "felis nec nunc. Aenean eget erat turpis, at consequat justo. Sed semper, " +
                    "lorem tempor convallis cursus, nisl arcu sollicitudin turpis, sit amet " +
                    "posuere mi augue ut massa. Sed vel arcu justo, quis hendrerit felis. Nam " +
                    "eget metus in ipsum lacinia mattis sit amet ut nisl. Quisque non elit " +
                    "lacinia metus dignissim ornare et quis turpis. Ut vehicula est ac eros " +
                    "facilisis ultrices. Nulla in ligula et ante tincidunt pellentesque quis " +
                    "sit amet orci. Phasellus consequat condimentum felis eget mattis." +
                    "</p>" +
                    "<p>" +
                    "Nam dictum nisl sit amet tellus auctor porttitor. Sed massa tortor, ultrices " +
                    "quis dictum ut, vehicula at dui. Aenean fermentum venenatis velit, commodo " +
                    "suscipit nisi malesuada sollicitudin. Nam iaculis mauris nec massa luctus " +
                    "vulputate. Pellentesque congue convallis mi, ac gravida massa tincidunt dapibus. " +
                    "Curabitur adipiscing leo id tellus fermentum sollicitudin volutpat enim egestas. " +
                    "Proin varius blandit arcu ut dapibus. Class aptent taciti sociosqu ad litora " +
                    "torquent per conubia nostra, per inceptos himenaeos. Ut volutpat, mi a ullamcorper " +
                    "vulputate, augue massa fringilla nisl, at luctus augue justo ut arcu. Donec ultrices " +
                    "pretium turpis, quis iaculis lectus semper in." +
                    "</p>";
                }
                result.callback(this._CLOBData[id]);
                return result;
            };
            
            this.updateCLOB = function(id, newData) {
                var result = new dojo.Deferred();
                this._CLOBData[id] = newData;
                result.callback();
                return result;
            };
            
            this.save = function(dataReader, success, error) {
				var result = new dojo.Deferred();
                // just eat all of the changes.
                if (readonly) {
                    result.errback("Can't save to this sample database.")
                } else {
                    // pretend to cycle through the data reader, so that
                    // we can test it. a 'debugger' keyword before this
                    // will make this easier.
                    my.ProjectData.Drivers._writeStandardJSONFormat(dataReader).then(function(rawData) {
                        // add a timeout to be able to test the 'waiting' dialog.
                        setTimeout(function() {
                            var content = dojo.toJson(rawData, true);
                            result.callback();
                        }, 1000);
                    }, function(ex) {
                        result.errback(ex);
                    });
                }
                return result;
            }
            
        }
        
        var parseUri = uriString.split('://');
        if (parseUri.length > 1) {
            path = parseUri[1].split('?');
            return new SampleIOHandler(path[0], path[1] && (path[1] == 'readonly=true'));
        }
        return null;
    }
};

