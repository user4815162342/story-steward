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
var Controller = new function() {

    var isInitialized = false;
    
    var booksDataModel = null;
    var booksTree = null;
    var notesDataModel = null;
    var notesTree = null;
    var journalsDataModel = null;
    var journalsTree = null;
    var peopleDataModel = null;
    var peopleTree = null;
    var placesDataModel = null;
    var placesTree = null;
    var thingsDataModel = null;
    var thingsTree = null;
    var goalsDataModel = null;
    var goalsTree = null;
    var openProjectDialog = null;
    
    var userSettings = null;
    
    var mruStore = new dojo.data.ItemFileWriteStore({
        data: {
            identifier: "uri",
            label: "uri",
            items: []
        }
    });
    mruStore._saveCustom = function(callback, errback) {
        var saveData = [];
        var lastUsed;
        this.fetch({
            onItem: dojo.hitch(this, function(item) {
                saveData.push({
                    uri: this.getIdentity(item),
                    lastUsed: dojo.date.stamp.toISOString(this.getValue(item, "lastUsed", new Date()))
                })
            }),
            onComplete: dojo.hitch(this, function() {
                userSettings.recentProjects = saveData;
                my.Settings.save();
                callback();
            }),
            onError: function(ex) {
                errback(ex);
            }
        })
    }
    
    this.ProjectData = null;
    
    this._createTreeModel = function(type, childrenAttrs) {
        return new dijit.tree.ForestStoreModel({
            store: this.ProjectData.ProjectStore,
            query: {
                type: type
            },
            rootId: "root",
            rootLabel: "Root",
            childrenAttrs: childrenAttrs
        });
    }
    
    this._createTree = function(model, type, placeAt) {
        // NOTE: Cookies are turned off for these trees (persist: false) because:
        // 1) It wasn't doing anything anyway, when I reload I still had to expand. 
        // 2) I'd prefer to save all of those things with the project.
        // 3) A bug in firefox (https://bugzilla.mozilla.org/show_bug.cgi?id=430045)
        // makes it not persist cookie exceptions for local files, which means
        // opening this document up from a file scheme leads to about 10 cookie
        // prompts, very annoying.
        var result = new dijit.Tree({
            model: model,
            showRoot: false,
            persist: false,
            onClick: this.clickContentItem,
            dndController: "dijit.tree.dndSource",
            betweenThreshold: 5,
            checkItemAcceptance: function(target, source, position) {
                return Controller.CheckTreeNodeAcceptance(type, target, source, position);
            },
            getIconClass: dojo.hitch(this, this._getTreeNodeIconClass)
        
        }).placeAt(placeAt);
        
        return result;
    }
    
    this._destroyTrees = function() {
        if (goalsTree) {
            goalsTree.destroy();
            goalsTree = null;
            goalsDataModel.destroy();
            goalsDataModel = null;
        }
        if (thingsTree) {
            thingsTree.destroy();
            thingsTree = null;
            thingsDataModel.destroy();
            thingsDataModel = null;
        }
        if (placesTree) {
            placesTree.destroy();
            placesTree = null;
            placesDataModel.destroy();
            placesDataModel = null;
        }
        if (peopleTree) {
            peopleTree.destroy();
            peopleTree = null;
            peopleDataModel.destroy();
            peopleDataModel = null;
        }
        if (journalsTree) {
            journalsTree.destroy();
            journalsTree = null;
            journalsDataModel.destroy();
            journalsDataModel = null;
        }
        if (notesTree) {
            notesTree.destroy();
            notesTree = null;
            notesDataModel.destroy();
            notesDataModel = null;
        }
        if (booksTree) {
            booksTree.destroy();
            booksTree = null;
            booksDataModel.destroy();
            booksDataModel = null;
        }
    }
    
    this._createTrees = function() {
    
    
        booksDataModel = this._createTreeModel('content', ["content"]);
        booksTree = this._createTree(booksDataModel, 'content', 'contentTree');
        notesDataModel = this._createTreeModel('note', ['subnotes']);
        notesTree = this._createTree(notesDataModel, 'note', 'notesTree');
        journalsDataModel = this._createTreeModel('journal', []);
        journalsTree = this._createTree(journalsDataModel, 'journal', 'journalsTree');
        peopleDataModel = this._createTreeModel('person', []);
        peopleTree = this._createTree(peopleDataModel, 'person', 'peopleTree');
        placesDataModel = this._createTreeModel('place', []);
        placesTree = this._createTree(placesDataModel, 'place', 'placesTree');
        thingsDataModel = this._createTreeModel('thing', []);
        thingsTree = this._createTree(thingsDataModel, 'thing', 'thingsTree');
        goalsDataModel = this._createTreeModel('goal', []);
        goalsTree = this._createTree(goalsDataModel, 'goal', 'goalsTree');
        
    }
    
    this.Initialize = function() {
        if (!isInitialized) {
        
            document.title = ApplicationInfo.Title;
            
            dojo.byId("statusPanel-appName").innerHTML = ApplicationInfo.Title + " " + ApplicationInfo.Version.Major + "." + ApplicationInfo.Version.Minor + "." + ApplicationInfo.Version.Revision;
            
            this.ProjectData = new my.ProjectData();
            
            dojo.connect(this.ProjectData, "onBeginLoad", this, this._projectBeginLoad);
            dojo.connect(this.ProjectData, "onEndLoad", this, this._projectEndLoad);
            dojo.connect(this.ProjectData, "onLoadError", this, this._projectLoadError);
            dojo.connect(this.ProjectData, "onSaveError", this, this._projectSaveError);
            dojo.connect(this.ProjectData, "onEndSave", this, this._projectEndSave)
            dojo.connect(this.ProjectData, "onTitleChange", this, this._projectTitleChange);
            dojo.connect(this.ProjectData, "onDirtyChange", this, this._projectDirtyChange);
            dojo.connect(this.ProjectData, "onMessage", this, this._projectMessage);
            dojo.connect(dojo.global, "onresize", this, this._windowResize);
            
            dojo.addOnBeforeUnload(dojo.hitch(this, function() {
                if (this.ProjectData.IsDirty()) {
                    return "The project has been modified. Are you sure you want to leave this page before saving?";
                }
            }));
            
            // NOTE: The following allows us to turn on and off escape handling.			
            openProjectDialog = dijit.byId("openProjectDialog");
            openProjectDialog._originalOnKey = openProjectDialog._onKey;
            var openProjectCombo = dijit.byId("openProjectDialog-value");
            openProjectCombo.set('fetchProperties', {
                sort: {
                    attribute: "lastUsed",
                    descending: true
                }
            });
            openProjectCombo.set('store', mruStore);
            
            
            dojo.when(my.Settings.get(), function(data) {
                userSettings = data;
                // load recent projects...
                if (!userSettings.recentProjects) {
                    userSettings.recentProjects = [];
                }
                // sort them descending by date.
                userSettings.recentProjects.sort(function(a, b) {
                    if (b.lastUsed > a.lastUsed) {
                        return 1;
                    }
                    if (a.lastUsed > b.lastUsed) {
                        return -1;
                    }
                    return 0;
                })
                for (var i = 0; i < userSettings.recentProjects.length; i++) {
                    var item = userSettings.recentProjects[i];
                    mruStore.newItem({
                        uri: item.uri,
                        lastUsed: dojo.date.stamp.fromISOString(item.lastUsed)
                    })
                }
                
            }, function(ex) {
                alert("While loading settings: " + ex);
            })
            
        }
    }
    
    var isFullScreen = false;
    
    this.toggleFullScreen = function() {
        if (isFullScreen) {
            this.turnOffFullScreen();
        } else {
            this.turnOnFullScreen();
        }
    }
    
    this._windowResize = function() {
        if (dojo.global.fullScreen) {
            this.turnOnFullScreen()
        } else {
            this.turnOffFullScreen();
        }
    }
    
    this.turnOffFullScreen = function() {
        if (isFullScreen) {
            dojo.removeClass(dojo.body(), "fullScreen");
            
            dijit.byId("main").resize();
            dijit.byId("systemToolBar-fullScreen").set('checked', false);
            dijit.byId("floatingSystemToolbar-fullScreen").set('checked', false);
            isFullScreen = false;
        }
    }
    
    this.turnOnFullScreen = function() {
        if (!isFullScreen) {
            dojo.addClass(dojo.body(), "fullScreen");
            dijit.byId("main").resize();
            dijit.byId("systemToolBar-fullScreen").set('checked', true);
            dijit.byId("floatingSystemToolbar-fullScreen").set('checked', true);
            isFullScreen = true;
        }
    }
    
    var openTabs = {};
    
    
    this.ShowProjectProperties = function() {
        this.ProjectData.ProjectStore.fetch({
            query: {
                uid: 'project'
            },
            onItem: function(item) {
                Controller.ShowDataItem(item);
            },
            onError: function() {
                alert("Error fetch project properties.");
            }
        });
    };
    
    this._getTreeNodeIconClass = function(item, opened) {
        if (this.ProjectData.ProjectStore.isItem(item)) {
            var type = this.ProjectData.ProjectStore.getValue(item, "type", "");
            if (this.ProjectData.TypeLookup.hasOwnProperty(type) && this.ProjectData.TypeLookup[type].isAbstract) {
                type = this.ProjectData.ProjectStore.getValue(item, "subtype", "");
            }
            if (this.ProjectData.TypeLookup.hasOwnProperty(type)) {
                return this.ProjectData.TypeLookup[type].iconClass;
            }
        }
    };
    
    this.CheckTreeNodeAcceptance = function(treeType, target, source, position) {
        if (this.ProjectData.ReadOnly) {
            return false;
        }
        try {
            if (source !== undefined) {
                var nodes = source.anchor; //get the dragged tree row's div
                var id = nodes.id; //get the id of the dragged div
                var dragDndItem = source.getItem(id); //get the dnd item for the dragged div
                var dragTreeNode = dragDndItem.data; //get the treenode of the dragged div
                var dragItem = dragTreeNode.item; //get the store item bound to the dragged treenode
                var dragType = this.ProjectData.ProjectStore.getValue(dragItem, "type", "");
                // can't drag items of other types into here.
                if (dragType != treeType) {
                    return false;
                }
                if (this.ProjectData.TypeLookup[dragType].isAbstract) {
                    dragType = this.ProjectData.ProjectStore.getValue(dragItem, "subtype", "");
                }
                var allowedParents = this.ProjectData.TypeLookup[dragType].allowedParents;
                
                // Find Target Info.
                var targetNode = dijit.getEnclosingWidget(target);
                if (targetNode.indent < 0) {
                    // anything can be in the root.
                    return true;
                }
                if ((position == "before") || (position == "after")) {
                    // we are actually dealing with the parent, not this target.
                    targetNode = targetNode.getParent();
                    if (targetNode.indent < 0) {
                        // again, anything can be in the root.
                        return true;
                    }
                }
                if (allowedParents.length == 0) {
                    // item can not be contained in anything but the root, so return false now.
                    return false;
                }
                var targetItem = targetNode.item;
                var targetType = this.ProjectData.ProjectStore.getValue(targetItem, "type", "");
                if (this.ProjectData.TypeLookup[targetType].isAbstract) {
                    targetType = this.ProjectData.ProjectStore.getValue(targetItem, "subtype", "");
                }
                return dojo.indexOf(allowedParents, targetType) > -1;
            }
            
        } catch (e) {
            // catch any errors to make sure the UI doesn't leave
            // weird panels everywhere.
        }
        return false;
    }
    
    
    this.ShowDataItem = function(item) {
        var uid = this.ProjectData.ProjectStore.getValue(item, "uid", "");
        var tabs = dijit.byId("contentTabs");
        if (openTabs.hasOwnProperty(uid)) {
            tabs.selectChild(openTabs[uid]);
        } else {
            var type = this.ProjectData.ProjectStore.getValue(item, "type", "");
            if (this.ProjectData.TypeLookup.hasOwnProperty(type) && this.ProjectData.TypeLookup[type].isAbstract) {
                type = this.ProjectData.ProjectStore.getValue(item, "subtype", "");
            }
            if (this.ProjectData.TypeLookup.hasOwnProperty(type)) {
                var form = this.ProjectData.TypeLookup[type].form;
                var args = {
                    dataItem: item,
                    dataStore: this.ProjectData.ProjectStore,
                    closable: true,
                    form: form,
                    title: this.ProjectData.TypeLookup[type].typeLabel,
                    iconClass: this.ProjectData.TypeLookup[type].iconClass,
                    bindScope: this
                }
                // NOTE: Putting a wait here because this is a slow process, and I want
                // some visual indication. Even though the dialog never actually shows up 
                // because it's so quick.
                // FUTURE: The thing that will really speed up the process, I think, is
                // if I have the viewer screen templates included inline, instead of
                // being loaded at runtime.
                var wait = this.ShowWaitDialog("Opening...", "<p>Opening tab, please wait...</p>");
                try {
                    var viewer = new my.DataItemViewer(args);
                } catch (ex) {
                    wait.hide();
                    if (ex.number && (ex.number === -2146697211)) {
                        alert("Running this application from a local file URL in IE is not currently supported.")
                        return;
                    }
                    throw ex;
                }
                openTabs[uid] = viewer;
                viewer.onClose = function() {
                    if (viewer.IsEditing()) {
                        // FUTURE: Should have a 'confirmation' dialog instead,
                        // possibly focusing the control that is editing.
                        alert("Can't close, some field is still editing!");
                        return false;
                    }
                    delete openTabs[uid];
                    // NOTE: This actually defers the reset until later,
                    // so it will work even though the tab is still open
                    // at this point in the function.
                    Controller.ResetTabsMenu(viewer);
                    return true;
                }
                viewer.DataItemRemoved = function() {
                    // just simulate a 'close' button click to make it
                    // close gracefully.
                    tabs.tablist.onCloseButtonClick(viewer);
                }
                // Delay the creation of the tab a little bit, in order to
                // make sure that everything else hooking into this onnew has
                // a chance to run rather quickly.
                dojo.when(tabs.addChild(viewer), dojo.hitch(this, function() {
                    dojo.when(tabs.selectChild(viewer), dojo.hitch(this, function() {
                        dojo.when(this.ResetTabsMenu(), dojo.hitch(this, function() {
                            wait.hide();
                        }))
                    }))
                }))
            } else {
                throw "Invalid data item type."
            }
        }
    };
    
    this.DeleteItem = function(item) {
        var label = this.ProjectData.ProjectStore.getValue(item, "name", null);
        var prompt = "<p>Are you sure you want to delete " + (("<em>" + label + "</em>") || "this item") + " and all of its children?</p>";
        this.ShowYesNoDialog("Delete Item", prompt).then(dojo.hitch(this, function(answer) {
            switch (answer) {
                case "yes":
                    var ProjectData = this.ProjectData;
                    var CloseChildTabs = function(item) {
                        // TODO: Can this be converted into a loop instead of recursion?
                        var type = ProjectData.ProjectStore.getValue(item, "type", "");
                        if (ProjectData.TypeLookup.hasOwnProperty(type) && ProjectData.TypeLookup[type].isAbstract) {
                            type = ProjectData.ProjectStore.getValue(item, "subtype", "");
                            
                        }
                        var childrenAttributes = ProjectData.TypeLookup[type].childrenAttributes;
                        for (var i = 0; i < childrenAttributes.length; i++) {
                            var children = ProjectData.ProjectStore.getValues(item, childrenAttributes[i]);
                            for (var j = 0; j < children.length; j++) {
                                if (ProjectData.ProjectStore.isItem(children[j])) {
                                    CloseChildTabs(children[j]);
                                    var uid = ProjectData.ProjectStore.getValue(children[j], "uid");
                                    if (openTabs.hasOwnProperty(uid)) {
                                        // simulate a 'deleted' event so the tab closes itself.
                                        openTabs[uid]._DataItemDeleted(children[j]);
                                    }
                                }
                            }
                        }
                        
                    }
                    
                    // NOTE: This is not notifying the children of the item
                    // being deleted, which means that their tabs aren't closing
                    // as well. When an item is deleted, there's no notification
                    // that it's children are deleted as well. Until I can figure
                    // that out, I need to do this.
                    // TODO: Let Dojo know that this would be a useful notification
                    // to have. Along with the ability to find the 'parent' for 
                    // a data item.
                    CloseChildTabs(item);
                    ProjectData.ProjectStore.deleteItem(item);
                    break;
                case "no":
                    break;
            }
        }));
    }
    
    this._newItemOnTree = function(type, tree, selectedPath, parent, parentAttribute) {
        if (!selectedPath) {
            selectedPath = [tree.get('rootNode')];
        }
        var item = this.ProjectData.NewDataItem(type, null, parent ? {
            parent: parent,
            attribute: parentAttribute
        } : null);
        this.ShowDataItem(item);
        selectedPath.push(item)
        tree.set('path', selectedPath).then(function() {
            tree.focusNode(tree.get('selectedNode'))
        });
    }
    
    /*
     * Basically, will create the new item as a child of the current, if it is a valid parent. Otherwise
     * as a sibling or auntuncle of the current depending on the first valid parent.
     */
    this._newContentItem = function(type) {
        var typeInfo = this.ProjectData.TypeLookup[type];
        var parent = null;
        var selectedPath = null;
        if (typeInfo.allowedParents.length > 0) {
            var node = booksTree.get('selectedNode');
            if (node && node.domNode) { // in IE, the node is null if not selected, in Firefox, it's the domNode. 
                selectedPath = booksTree.get('path');
                if (selectedPath) {
                    // NOTE: I don't want to include the first one, as that is the 'root' node and
                    // won't be a data item, but will always be a valid parent.
                    for (var i = (selectedPath.length - 1); i > 0; i--) {
                        if (dojo.indexOf(typeInfo.allowedParents, this.ProjectData.ProjectStore.getValue(selectedPath[i], "subtype", "")) > -1) {
                            parent = selectedPath[i];
                            break;
                        }
                        selectedPath.pop();
                    }
                }
            }
        }
        this._newItemOnTree(type, booksTree, selectedPath, parent, "content");
    }
    
    this.NewBook = function() {
        this._newContentItem("book");
        
    }
    
    this.NewPart = function() {
        this._newContentItem("part");
    }
    
    this.NewChapter = function() {
        this._newContentItem("chapter");
    }
    
    this.NewScene = function() {
        this._newContentItem("scene");
    }
    
    this.NewNote = function() {
        this._newItemOnTree("note", notesTree);
    }
    
    this.NewSubNote = function() {
        var parent = null;
        var selectedPath = null;
        var node = notesTree.get('selectedNode');
        if (node && node.domNode) { // otherwise, the node has been deleted and we can't use it.
            selectedPath = notesTree.get('path');
            if (selectedPath) {
                // NOTE: I don't want to include the first one, as that is the 'root' node and
                // won't be a data item, but will always be a valid parent.
                if (selectedPath.length > 1) {
                    parent = selectedPath[selectedPath.length - 1];
                }
            }
        }
        this._newItemOnTree("note", notesTree, selectedPath, parent, "subnotes");
    }
    
    this.NewJournal = function() {
        this._newItemOnTree("journal", journalsTree);
    }
    
    this.NewPerson = function() {
        this._newItemOnTree("person", peopleTree);
        
    }
    
    this.NewPlace = function() {
        this._newItemOnTree("place", placesTree);
        
    }
    
    this.NewThing = function() {
        this._newItemOnTree("thing", thingsTree);
    }
    
    this.NewGoal = function() {
        this._newItemOnTree("goal", goalsTree);
    }
    
    this._tabUpdateCount = 0;
    
    
    this.BeginTabUpdate = function() {
        this._tabUpdateCount++;
    }
    
    this.EndTabUpdate = function() {
        this._tabUpdateCount--;
        if (this._tabUpdateCount === 0) {
            this.ResetTabsMenu();
        }
    }
    
    var resettingTabs = false;
    
    this.ResetTabsMenu = function() {
        if (this._tabUpdateCount > 0) {
            return;
        }
        // This mechanism ensures that if we close a whole bunch at once,
        // the tab menu is only reset once after the current script context
        // is finished. It's better than a BeginUpdate/EndUpdate system,
        // as I don't have to *know* that I'm doing this. 
        if (!resettingTabs) {
            resettingTabs = true; // turn on a flag so we only call this once.
            setTimeout(dojo.hitch(this, function() {
                resettingTabs = false; // turn off the flag to let it run again if called now.
                // FUTURE: It would be better to set up some sort of widget, perhaps
                // even getting the dropdown menu directly from the TabContainer.
                var menu = dijit.byId("floatingSystemToolbar-chooseTab-menu");
                menu.destroyDescendants();
                var tabs = dijit.byId("contentTabs");
                dojo.forEach(tabs.getChildren(), function(page) {
                    var menuItem = new dijit.MenuItem({
                        id: "floatingSystemToolbar-chooseTab-menu-" + page.id,
                        label: page.title,
                        iconClass: page.iconClass,
                        dir: page.dir,
                        lang: page.lang,
                        onClick: function() {
                            tabs.selectChild(page);
                        }
                    });
                    menu.addChild(menuItem);
                });
                
            }), 0)
        }
        
        
    }
    
    
    
    this.clickContentItem = function(item, node, evt) {
        Controller.ShowDataItem(item);
    }
    
    this.CheckSave = function() {
        var result = new dojo.Deferred();
        var me = this;
        if (this.ProjectData.IsDirty()) {
            this.ShowYesNoCancelDialog("Save Project", "<p>The project has been modified. Would you like to save it?</p>").then(function(answer) {
                switch (answer) {
                    case "yes":
                        me.SaveProject().then(function(success) {
                            if (success) {
                                result.callback(true);
                            } else {
                                result.callback(false);
                            }
                        })
                        break;
                    case "no":
                        result.callback(true);
                        break;
                    case "cancel":
                        result.callback(false);
                        break;
                }
            });
        } else {
            result.callback(true);
        }
        return result;
    }
    
    this._LoadProject = function(uri, mightBeNew, forceReadOnly) {
        var result = new dojo.Deferred();
        var me = this;
        this.ProjectData.LoadProject(uri, mightBeNew, forceReadOnly).then(function() {
            me.StartupGoals().then(function() {
                result.callback(true);
            }, function(e) {
                result.errback(e);
            });
        }, function(e) {
            result.errback(e);
        });
        return result;
        
    }
    
    this.OpenProject = function() {
        var result = new dojo.Deferred();
        var me = this;
        this.CheckSave().then(function(answer) {
            if (answer) {
                me.ShowOpenProjectDialog().then(function(value) {
                    if (value) {
                        var wait = me.ShowWaitDialog("Loading...", "<p>Loading Project, please wait...</p>");
                        wait.attach(me._LoadProject(value.uri, value.mightBeNew, value.forceReadOnly).then(function() {
                            result.callback(true)
                        }, function(ex) {
                            if (!unloadedMode) {
                                alert("While Loading: " + ex);
                            } // else, there was a load error, and the message was shown on *that* dialog.
                            result.errback(ex);
                        }));
                    } else {
                        result.callback(false)
                    }
                });
            } else {
                result.callback(false);
            }
        }, function(e) {
            result.errback(e);
        });
        return result;
    }
    
    this.SaveProject = function() {
        var wait = this.ShowWaitDialog("Saving...", "<p>Saving Project, please wait...</p>");
        var result = new dojo.Deferred();
        var tabSavers = [];
        for (var uid in openTabs) {
            if (openTabs.hasOwnProperty(uid)) {
                if (openTabs[uid].IsEditing && openTabs[uid].IsEditing()) {
                    tabSavers.push(openTabs[uid].ApplyEditing());
                }
            }
        }
        var deferredApplies = new dojo.DeferredList(tabSavers, false, true);
        var me = this;
        deferredApplies.then(function() {
            me.UpdateGoals().then(function() {
                me.ProjectData.SaveProject().then(function() {
                    result.callback(true);
                }, function(ex) {
                    result.errback(ex);
                })
            }, function(e) {
                result.errback(e);
            });
        }, function(ex) {
            result.errback(ex);
        })
        wait.attach(result);
        result.then(null, function(ex) {
            alert("While Saving: " + ex)
        })
        return result;
    }
    
    this.TriggerFailSafe = function() {
        // basically, open the project and any open contents in a new
        // window.
        var wait = this.ShowWaitDialog("Exporting Content...", "<p>Exporting open data into other browser windows...</p>");
        try {
            var result = this.ProjectData.GetJSON();
            result.then(dojo.hitch(this, function(data) {
                var content = dojo.toJson(data, true);
                var newWindow = window.open();
                newWindow.document.open("application/json", "replace");
                newWindow.document.write(content);
                newWindow.document.close();
                
                for (var uid in openTabs) {
                    if (openTabs.hasOwnProperty(uid)) {
                        if (openTabs[uid].dataItem) {
                            var name = this.ProjectData.ProjectStore.getValue(openTabs[uid].dataItem, "name", "");
                            attrs = this.ProjectData.GetCLOBAttributes(openTabs[uid].dataItem);
                            for (var i = 0; i < attrs.length; i++) {
                                content = name + " (" + uid + ") >> " + attrs[i] + ":\n";
                                content += openTabs[uid].GetRawFieldValue(attrs[i]);
                                newWindow = window.open();
                                newWindow.document.open("text/plain", "replace");
                                newWindow.document.write(content);
                                newWindow.document.close();
                            }
                            
                        }
                    }
                }
            }), function(ex) {
                alert("Sorry, there's nothing I can do!")
            })
            wait.attach(result);
            return result;
        } catch (ex) {
            wait.hide();
            throw ex;
        }
    }
    
    this._BuildManuscriptText = function(dataItem, showSceneTitles, state) {
        state = state ||
        {
            ordinals: {
                book: 1,
                part: 1,
                chapter: 1
            }
        }
        var result = new dojo.Deferred();
        try {
            var type = this.ProjectData.ProjectStore.getValue(dataItem, "type", "")
            if (type == "content") {
                if (this.ProjectData.ProjectStore.getValue(dataItem, "doNotPublish", false)) {
                    result.callback();
                } else {
                    type = this.ProjectData.ProjectStore.getValue(dataItem, "subtype", "")
                    var title = this.ProjectData.ProjectStore.getValue(dataItem, "name", "Untitled");
                    switch (type) {
                        case "book":
                        case "part":
                        case "chapter":
                            var writer = {
                                title: title,
                                writeTitle: dojo.hitch(this, function(doc) {
                                    var tag = this.ProjectData.TypeLookup[type].titleTag;
                                    doc.write("<" + tag + ">");
                                    // FUTURE: How about using roman numerals?
                                    doc.write(this.ProjectData.TypeLookup[type].typeLabel + " " + state.ordinals[type] + ": ");
                                    state.ordinals[type]++;
                                    doc.write(title);
                                    doc.write("</" + tag + ">");
                                }),
                                write: dojo.hitch(this, function(doc) {
                                    var deferred = new dojo.Deferred();
                                    try {
                                        var contents = this.ProjectData.ProjectStore.getValues(dataItem, "content");
                                        var i = 0;
                                        var buildNext = dojo.hitch(this, function() {
                                        
                                            if (i < contents.length) {
                                                this._BuildManuscriptText(contents[i], (type == "book") || (type == "part"), state).then(function(writer) {
                                                    try {
                                                        if (writer) {
                                                            doc.write("<div>");
                                                            writer.writeTitle(doc);
                                                            dojo.when(writer.write(doc), function() {
                                                                doc.write("</div>");
                                                                i++;
                                                                buildNext();
                                                            }, function(ex) {
                                                                deferred.errback(ex);
                                                            });
                                                        } else {
                                                            // skip, not publishable, go on.
                                                            i++;
                                                            buildNext();
                                                        }
                                                    } catch (ex) {
                                                        deferred.errback(ex);
                                                    }
                                                }, function(ex) {
                                                    deferred.errback(ex);
                                                });
                                            } else {
                                                deferred.callback();
                                            }
                                        });
                                        buildNext();
                                    } catch (ex) {
                                        deferred.errback(ex);
                                    }
                                    return deferred;
                                })
                            }
                            result.callback(writer);
                            break;
                        case "scene":
                            var writer = {
                                title: title,
                                writeTitle: dojo.hitch(this, function(doc) {
                                    if (showSceneTitles) {
                                        var tag = this.ProjectData.TypeLookup[type].titleTag;
                                        doc.write("<" + tag + ">");
                                        doc.write(title);
                                        doc.write("</" + tag + ">");
                                    }
                                }),
                                write: dojo.hitch(this, function(doc) {
                                    var deferred = new dojo.Deferred();
                                    try {
                                        var clobID = this.ProjectData.ProjectStore.getValue(dataItem, "text", "");
                                        if (clobID) {
                                            this.ProjectData.GetCLOB(clobID).then(function(content) {
                                                doc.write(content);
                                                deferred.callback();
                                            }, function(ex) {
                                                deferred.errback(ex);
                                            });
                                        } else {
                                            deferred.callback();
                                        }
                                    } catch (ex) {
                                        deferred.errback(ex);
                                    }
                                    return deferred;
                                })
                            }
                            result.callback(writer);
                            break;
                        default:
                            result.callback();
                    }
                }
            }
        } catch (ex) {
            result.errback(ex);
        }
        return result;
    }
    
    this.BuildManuscript = function(dataItem) {
        var wait = this.ShowWaitDialog("Loading...", "<p>Loading Project, please wait...</p>");
        wait.attach(this._BuildManuscriptText(dataItem).then(function(writer) {
            if (writer) {
                var newWindow = window.open();
                var doc = newWindow.document;
                doc.open("text/html", "replace");
                doc.write("<!DOCTYPE html PUBLIC \" -//W3C//DTD HTML 4.01 Transitional//EN\">");
                doc.write("<html>");
                doc.write("<head>");
                doc.write("<title>");
                doc.write(writer.title);
                doc.write("</title>");
                doc.write("</head>");
                doc.write("<body>");
                dojo.when(writer.write(doc), function() {
                    doc.write("</body>");
                    doc.write("</html>");
                    doc.close();
                    
                }, function(ex) {
                    alert("While building manuscript: " + ex);
                    doc.write("<p>Error: " + ex + "</p>");
                    doc.close();
                });
            } else {
                alert("Item contains no content");
            }
        }, function(ex) {
            alert("While building manuscript: " + ex);
            
        }));
        
        
    }
    
    this.ShowRandomQuote = function() {
        var result = new dojo.Deferred();
        var dialog = dijit.byId("quoteDialog");
        dialog.set('refocus', true);
        var connections = [];
        var buttonClosed = false;
        var ok = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("ok");
        }
        var next = dojo.hitch(this, function() {
            dijit.byId("quoteDialog-prompt").set('content', this.Quotes.items[Math.floor(Math.random() * this.Quotes.items.length)]);
        });
        var close = function() {
            while (connections.length > 0) {
                dojo.disconnect(connections.pop());
            }
            if (!buttonClosed) {
                result.callback("cancel");
            }
            dialog.set('refocus', false);
        }
        dialog.set('title', this.Quotes.title);
        connections.push(dojo.connect(dijit.byId("quoteDialog-ok"), "onClick", this, ok));
        connections.push(dojo.connect(dijit.byId("quoteDialog-next"), "onClick", this, next));
        connections.push(dojo.connect(dialog, "onHide", this, close));
        next();
        dialog.startup();
        dialog.show();
        return result;
    }
    
    this._projectLoadError = function(e) {
        //alert("Can't load project: " + e);
        dojo.byId("statusPanel-saveStatus").innerHTML = this.ProjectData.IsDirty() ? "Not Saved" : "Saved";
        this._startUnloadedMode(e);
    }
    
    this._projectSaveError = function(e) {
        //alert("Can't save project: " + e)
        // NOTE: I don't think there's anything I need to do here, since
        // the error is alerted in SaveProject.
        dojo.byId("statusPanel-saveStatus").innerHTML = this.ProjectData.IsDirty() ? "Not Saved" : "Saved";
    }
    
    this._projectEndSave = function() {
        dojo.byId("statusPanel-saveStatus").innerHTML = this.ProjectData.IsDirty() ? "Not Saved" : "Saved";
        
    }
    
    this._projectDirtyChange = function() {
        dojo.byId("statusPanel-saveStatus").innerHTML = this.ProjectData.IsDirty() ? "Not Saved" : "Saved";
        
    }
    
    var msgTimeout = null;
    
    this._projectMessage = function(msg) {
        if (msgTimeout) {
            clearTimeout(msgTimeout);
        }
        dojo.byId("statusPanel-message").innerHTML = msg;
        msgTimeout = setTimeout(dojo.hitch(this, function() {
            dojo.byId("statusPanel-message").innerHTML = "";
            msgTimeout = null;
        }), 10000);
    }
    
    this._updateMRU = function() {
        var newUri = this.ProjectData.GetURI();
        var foundItem = false;
        var mruCount = 0;
        mruStore.fetch({
            onBegin: function(count) {
                mruCount = count;
            },
            onItem: dojo.hitch(this, function(item) {
                if (mruStore.getValue(item, "uri", "") == newUri) {
                    foundItem = true;
                    mruStore.setValue(item, "lastUsed", new Date());
                }
            }),
            onComplete: dojo.hitch(this, function() {
                if (!foundItem) {
                    mruStore.newItem({
                        uri: newUri,
                        lastUsed: new Date()
                    });
                    // If we've reached the max projects, we need to delete some.
                    var diff = (mruCount + 1) - (userSettings.recentProjectsMax || 20);
                    if (diff > 0) {
                        var deleteItems = [];
                        mruStore.fetch({
                            sort: {
                                attribute: "lastUsed",
                                descending: false
                            },
                            onItem: dojo.hitch(this, function(item) {
                                if (diff > 0) {
                                    deleteItems.push(item);
                                    diff--;
                                }
                                
                            }),
                            onComplete: dojo.hitch(this, function() {
                                while (deleteItems.length) {
                                    mruStore.deleteItem(deleteItems.pop());
                                }
                                mruStore.save();
                            })
                        })
                    } else {
                        mruStore.save();
                        
                    }
                } else {
                    mruStore.save();
                }
            })
        })
        
    }
    
    this._projectEndLoad = function() {
        if (this.ProjectData.ReadOnly) {
            dojo.addClass(dojo.body(), "readOnly");
        } else {
            dojo.removeClass(dojo.body(), "readOnly")
        }
        this._createTrees();
        
        // update the window title.
        this.ProjectData.ProjectStore.fetch({
            query: {
                uid: 'project'
            },
            onItem: dojo.hitch(this, function(item) {
                var title = this.ProjectData.ProjectStore.getValue(item, "name", null);
                this._projectTitleChange(title)
            }),
            onError: function() {
                alert("Error fetching project title");
            }
        });
        
        // update the MRU store:
        setTimeout(dojo.hitch(this, this._updateMRU), 0);
        
        // FUTURE: At this point, should also set user interface positions,
        // open previously opened tabs, etc.
        dojo.byId("statusPanel-saveStatus").innerHTML = this.ProjectData.IsDirty() ? "Not Saved" : "Saved";
        
    }
    
    this._projectTitleChange = function(newValue) {
        document.title = ApplicationInfo.Title + " \u2014 " + newValue || "Untitled";
    }
    
    this._projectBeginLoad = function() {
        for (var uid in openTabs) {
            if (openTabs.hasOwnProperty(uid)) {
                // just simulate a 'close' button click to make it
                // close gracefully.
                // NOTE: I would assume that the tabs probably delay some of
                // the user interface changes here. I don't *think* that would
                // be a problem, as I'm deleting from the openTabs as well.
                dijit.byId("contentTabs").tablist.onCloseButtonClick(openTabs[uid]);
            }
        }
        this._destroyTrees();
        dojo.byId("statusPanel-totalWordCount").innerHTML = "Words: ?";
        
    }
    
    this.UpdateGoals = function() {
        var result = new dojo.Deferred();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var store = this.ProjectData.ProjectStore;
        var project = this.ProjectData;
        var totalWordCount = null;
        var deferreds = [];
        
        var UpdateGoal = dojo.hitch(this, function(goal) {
            var ending = store.getValue(goal, "ending", null);
            // if the ending point of the goal has not been reached,
            // or if ending is null (meaning the ending is eternity)
            if ((!ending) || (dojo.date.compare(ending, today, "date") >= 0)) {
                var starting = store.getValue(goal, "starting", null);
                // if the starting point of the goal has been reached,
                // or if the starting point is null (meaning the start was when the
                // goal was created).
                if ((!starting) || (dojo.date.compare(starting, today, "date") <= 0)) {
                    var history = store.getValues(goal, "history");
                    var entry = null;
                    for (var i = 0; i < history.length; i++) {
                        var historyDate = store.getValue(history[i], "when");
                        if (dojo.date.compare(historyDate, today, "date") == 0) {
                            entry = history[i];
                        }
                        
                    }
                    if (!entry) {
                        entry = project.NewGoalHistoryEntry(goal, today);
                    }
                    if (totalWordCount === null) {
                        var result = this.CalculateTotalWordCount();
                        result.then(function(value) {
                            totalWordCount = value;
                            store.setValue(entry, "wordCount", value)
                            
                        });
                        return result;
                    } else {
                        store.setValue(entry, "wordCount", totalWordCount);
                    }
                    return null;
                }
            }
            return null;
        });
        
        
        this.ProjectData.ProjectStore.fetch({
            query: {
                type: 'goal'
            },
            onItem: function(item) {
                try {
                    var task = UpdateGoal(item);
                    if (task) {
                        deferreds.push(task);
                    }
                } catch (ex) {
                    result.errback("Error updating goal: " + ex);
                }
            },
            onComplete: dojo.hitch(this, function() {
                var list = new dojo.DeferredList(deferreds, false, true);
                list.then(function() {
                    result.callback();
                }, function(ex) {
                    result.errback(ex);
                })
            }),
            onError: function(ex) {
                result.errback("Error fetching goals for processing: " + ex);
            }
        });
        return result;
    }
    
    this.CalculateTotalWordCount = function() {
        var result = new dojo.Deferred();
        var totalCount = 0;
        var store = this.ProjectData.ProjectStore;
        var addWordCount = function(item) {
            var doNotPublish = store.getValue(item, "doNotPublish", false);
            if (doNotPublish) {
                return;
            }
            var subtype = store.getValue(item, "subtype", null);
            if (subtype) {
                if (subtype == "scene") {
                    totalCount += store.getValue(item, "lastWordCount", 0);
                } else {
                    var contents = store.getValues(item, "content");
                    for (var i = 0; i < contents.length; i++) {
                        addWordCount(contents[i]);
                    }
                }
            }
        }
        store.fetch({
            query: {
                type: 'content'
            },
            onItem: dojo.hitch(this, function(item) {
                addWordCount(item);
            }),
            onComplete: function() {
                // FUTURE: Is this really the right place to do this?
                dojo.byId("statusPanel-totalWordCount").innerHTML = "Words: " + totalCount;
                result.callback(totalCount);
            },
            onError: function(ex) {
                result.errback("Error fetching contents for calculating word count: " + ex);
            }
        });
        return result;
    }
    
    
    this.StartupGoals = function() {
        var result = new dojo.Deferred();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var store = this.ProjectData.ProjectStore;
        var totalWordCount = null;
        var deferreds = [];
        
        var StartupGoal = dojo.hitch(this, function(goal) {
            var ending = store.getValue(goal, "ending", null);
            // if the ending point of the goal has not been reached,
            // or if ending is null (meaning the ending is eternity)
            if ((!ending) || (dojo.date.compare(ending, today, "date") >= 0)) {
                var starting = store.getValue(goal, "starting", null);
                var startingCount = store.getValue(goal, "startingWordCount", null);
                // if the starting point of the goal has not been reached,
                // (if starting is null then the goal started as soon as it
                // was created)
                // or if the startingCount has not been set...
                if ((starting && (dojo.date.compare(starting, today, "date") >= 0)) ||
                (startingCount === null)) {
                    //     calculate the total word count for the goal and put
                    //     it in startingWordCount.
                    if (totalWordCount === null) {
                        var result = this.CalculateTotalWordCount();
                        result.then(function(value) {
                            totalWordCount = value;
                            store.setValue(goal, "startingWordCount", value)
                            
                        });
                        return result;
                    } else {
                        store.setValue(goal, "startingWordCount", totalWordCount);
                    }
                    return null;
                    
                }
            }
            return null;
        });
        
        
        this.ProjectData.ProjectStore.fetch({
            query: {
                type: 'goal'
            },
            onItem: function(item) {
                try {
                    var task = StartupGoal(item);
                    if (task) {
                        deferreds.push(task);
                    }
                } catch (ex) {
                    result.errback("Error updating goal: " + ex);
                    throw ex;
                }
            },
            onComplete: dojo.hitch(this, function() {
                var list = new dojo.DeferredList(deferreds, false, true);
                list.then(function() {
                    result.callback();
                }, function(ex) {
                    result.errback(ex);
                })
            }),
            onError: function(ex) {
                result.errback("Error fetching goals for processing: " + ex);
            }
        });
        return result;
    }
    
    this.UpdateWordCount = function(dataItem, text) {
        // http://www.electrictoolbox.com/count-words-fckeditor-javascript/
        var matches = text.replace(/<[^<|>]+?>|&nbsp;/gi, ' ').replace(/[^\w\s]/gi, '').match(/\b/g);
        var count = 0;
        if (matches) {
            count = matches.length / 2;
        };
        this.ProjectData.ProjectStore.setValue(dataItem, "lastWordCount", count);
    }
    
    this.ShowWaitDialog = function(title, message) {
        var dialog = new dijit.Dialog({
            title: title,
            //style: "width:250px;height:100px",
            closable: false,
            refocus: false
        });
        // as closable doesn't work, this prevents the escape key from closing it.
        dialog._onKey = function() {
        };
        dojo.style(dialog.closeButtonNode, "display", "none");
        dialog.set('content', message);
        dialog.startup();
        dialog.show();
        return {
            attach: function(deferred) {
                deferred.then(function() {
                    dialog.hide();
                    dialog.destroy();
                }, function() {
                    dialog.hide();
                    dialog.destroy();
                })
            },
            hide: function() {
                dialog.hide();
                dialog.destroy();
            }
        };
    }
    
    this.ShowInputDialog = function(title, message, defaultValue) {
        var result = new dojo.Deferred();
        var dialog = dijit.byId("inputDialog");
        dialog.set('refocus', true);
        var textbox = dijit.byId("inputDialog-value");
        var connections = [];
        var buttonClosed = false;
        var accept = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback(textbox.get('value'));
        }
        var cancel = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback();
        }
        var close = function() {
            while (connections.length > 0) {
                dojo.disconnect(connections.pop());
            }
            if (!buttonClosed) {
                result.callback();
            }
            dialog.set('refocus', false);
        }
        dialog.set('title', title);
        dojo.byId("inputDialog-prompt").innerHTML = message;
        textbox.set('value', defaultValue);
        connections.push(dojo.connect(dijit.byId("inputDialog-accept"), "onClick", this, accept));
        connections.push(dojo.connect(dijit.byId("inputDialog-cancel"), "onClick", this, cancel));
        connections.push(dojo.connect(dialog, "onHide", this, close));
        dialog.startup();
        dialog.show();
        return result;
    }
    
    var unloadedMode = false;
    
    this._startUnloadedMode = function(error) {
        document.title = ApplicationInfo.Title;
        dojo.style("openProjectDialog-error", "display", "none");
        if (!unloadedMode) {
            unloadedMode = true;
            var me = this;
            openProjectDialog.set('refocus', true);
            openProjectDialog.set('closable', false);
            // as closable doesn't work, this prevents the escape key from closing it.
            openProjectDialog._onKey = function() {
            };
            dojo.style(openProjectDialog.closeButtonNode, "display", "none");
            dojo.style("openProjectDialog-cancel", "display", "none");
            var textbox = dijit.byId("openProjectDialog-value");
            var newCheckbox = dijit.byId("openProjectDialog-mightBeNew");
            var readOnlyCheckbox = dijit.byId("openProjectDialog-readOnly");
            var connections = [];
            var buttonClosed = false;
            var accept = function() {
                me._LoadProject(textbox.get('value'), newCheckbox.get('value'), readOnlyCheckbox.get('value')).then(function() {
                    openProjectDialog.hide();
                    unloadedMode = false;
                    
                }, function(ex) {
                    dojo.byId("openProjectDialog-error").innerHTML = ex;
                    dojo.style("openProjectDialog-error", "display", "block");
                    
                });
            }
            var sample = function() {
                textbox.set('value', 'sample://TheDarkHorizon');
                newCheckbox.set('value', false)
                accept();
            }
            var close = function() {
                while (connections.length > 0) {
                    dojo.disconnect(connections.pop());
                }
                openProjectDialog.set('refocus', false);
            }
            connections.push(dojo.connect(dijit.byId("openProjectDialog-sample"), "onClick", this, sample));
            connections.push(dojo.connect(dijit.byId("openProjectDialog-accept"), "onClick", this, accept));
            connections.push(dojo.connect(openProjectDialog, "onHide", this, close));
            openProjectDialog.startup();
            openProjectDialog.show();
        }
        if (error) {
            dojo.byId("openProjectDialog-error").innerHTML = error;
            dojo.style("openProjectDialog-error", "display", "block");
        }
    }
    
    this.ShowOpenProjectDialog = function() {
        var result = new dojo.Deferred();
        dojo.style("openProjectDialog-error", "display", "none")
        openProjectDialog.set('refocus', true);
        openProjectDialog.set('closable', true);
        openProjectDialog._onKey = openProjectDialog._originalOnKey
        dojo.style(openProjectDialog.closeButtonNode, "display", "inline");
        dojo.style("openProjectDialog-cancel", "display", "inline");
        var textbox = dijit.byId("openProjectDialog-value");
        var newCheckbox = dijit.byId("openProjectDialog-mightBeNew");
        var readOnlyCheckbox = dijit.byId("openProjectDialog-readOnly");
        var connections = [];
        var buttonClosed = false;
        var accept = function() {
            buttonClosed = true;
            openProjectDialog.hide();
            result.callback({
                uri: textbox.get('value'),
                mightBeNew: newCheckbox.get('value'),
                forceReadOnly: readOnlyCheckbox.get('value')
            });
        }
        var sample = function() {
            textbox.set('value', 'sample://TheDarkHorizon');
            newCheckbox.set('value', false)
            accept();
        }
        var cancel = function() {
            buttonClosed = true;
            openProjectDialog.hide();
            result.callback();
        }
        var close = function() {
            while (connections.length > 0) {
                dojo.disconnect(connections.pop());
            }
            if (!buttonClosed) {
                result.callback();
            }
            openProjectDialog.set('refocus', false);
        }
        connections.push(dojo.connect(dijit.byId("openProjectDialog-sample"), "onClick", this, sample));
        connections.push(dojo.connect(dijit.byId("openProjectDialog-accept"), "onClick", this, accept));
        connections.push(dojo.connect(dijit.byId("openProjectDialog-cancel"), "onClick", this, cancel));
        connections.push(dojo.connect(openProjectDialog, "onHide", this, close));
        openProjectDialog.startup();
        openProjectDialog.show();
        return result;
    }
    
    this.ShowYesNoCancelDialog = function(title, message) {
        var result = new dojo.Deferred();
        var dialog = dijit.byId("yesNoCancelDialog");
        dialog.set('refocus', true);
        var connections = [];
        var buttonClosed = false;
        var yes = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("yes");
        }
        var no = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("no");
        }
        var cancel = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("cancel");
        }
        var close = function() {
            while (connections.length > 0) {
                dojo.disconnect(connections.pop());
            }
            if (!buttonClosed) {
                result.callback("cancel");
            }
            dialog.set('refocus', false);
        }
        dialog.set('title', title);
        dijit.byId("yesNoCancelDialog-prompt").set('content', message);
        connections.push(dojo.connect(dijit.byId("yesNoCancelDialog-yes"), "onClick", this, yes));
        connections.push(dojo.connect(dijit.byId("yesNoCancelDialog-no"), "onClick", this, no));
        connections.push(dojo.connect(dijit.byId("yesNoCancelDialog-cancel"), "onClick", this, cancel));
        connections.push(dojo.connect(dialog, "onHide", this, close));
        dialog.startup();
        dialog.show();
        return result;
    }
    
    this.ShowYesNoDialog = function(title, message) {
        var result = new dojo.Deferred();
        var dialog = dijit.byId("yesNoDialog");
        dialog.set('refocus', true);
        var connections = [];
        var buttonClosed = false;
        var yes = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("yes");
        }
        var no = function() {
            buttonClosed = true;
            dialog.hide();
            result.callback("no");
        }
        var close = function() {
            while (connections.length > 0) {
                dojo.disconnect(connections.pop());
            }
            if (!buttonClosed) {
                result.callback("cancel");
            }
            dialog.set('refocus', false);
        }
        dialog.set('title', title);
        dijit.byId("yesNoDialog-prompt").set('content', message);
        connections.push(dojo.connect(dijit.byId("yesNoDialog-yes"), "onClick", this, yes));
        connections.push(dojo.connect(dijit.byId("yesNoDialog-no"), "onClick", this, no));
        connections.push(dojo.connect(dialog, "onHide", this, close));
        dialog.startup();
        dialog.show();
        return result;
    }
    
    
    this.DataViewerFormat_ContentSubType = function(value) {
        if (this.ProjectData.TypeLookup.hasOwnProperty(value)) {
            return this.ProjectData.TypeLookup[value].typeLabel;
        }
        return value;
        
    };
    
    this.DataViewerFormat_CLOBToGUI = function(values, state) {
        // Basically, look for the CLOB value in the project data,
        // if we have an ID in the value. 
        // If we've been passed a state object, then store the clob
        // id in the state, so we can put the value back into the clob
        // later. Return the deffered object returned by GetCLOB,
        // so that the handler can get the data out.
        var value = values;
        if (dojo.isArray(values)) {
            if (values.length) {
                value = values[0];
            } else {
                value = null;
            }
        }
        if (value) {
            if (state) {
                state.clobID = value;
            }
            return this.ProjectData.GetCLOB(value);
        } else {
            return "";
        }
    };
    
    this.DataViewerFormat_CLOBToData = function(value, state) {
        // I can only update the CLOB if I have a state object.
        // If I do, then look for a clobID, and if there isn't
        // one, then create a new one. Then, update the CLOB
        // with the value, and return the clobID, so that
        // that gets assigned to the database. Return it
        // in a deferred, so that errors are displayed as
        // appropriate if the update fails.
        if (state) {
            var result = new dojo.Deferred();
            if (!state.clobID) {
                state.clobID = this.ProjectData.CreateCLOB();
            }
            this.ProjectData.UpdateCLOB(state.clobID, value).then(function() {
                result.callback(state.clobID);
            }, function(ex) {
                result.errback(ex);
            });
            return result;
        }
        return result;
    };
    
    this.DataViewerFormat_GetTagStore = function() {
        return this.ProjectData.Customizations.Tags;
    }
    
    this.GridFormat_NegateDoNotPublish = function(value) {
        // Turns Do Not Publish into it's opposite for a grid, so the column
        // can be called Publish.
        return value ? false : true;
    }
    
    this.GridFormat_DisplayShortDate = function(value) {
        return dojo.date.locale.format(value, {
            selector: 'date',
            fullYear: true
        });
    }
    
    this.GridFormat_DisplayTags = function(value) {
        var result = "";
        if (value) {
            for (var i = 0; i < value.length; i++) {
                if (i > 0) {
                    result += ", ";
                }
                result += value.getItem(i);
            }
        }
        return result;
        
    }
    
    this.GridFormat_DisplayHTMLSafe = function(value) {
        if (value) {
            return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        } else {
            return "";
        }
    }
    
    this.DataViewer_NewCredit = function(parentItem) {
        return this.ProjectData.NewDataItem("credit", {
            name: "",
            biography: "<p></p>",
            role: "Author"
        }, {
            parent: parentItem,
            attribute: "credits"
        })
    }
    
    this.DataViewerFormat_SceneRatingName = function(i) {
        var ratings = this.ProjectData.Customizations.Scene.Ratings;
        if (i < ratings.length) {
            return ratings[i].name;
        }
        return "Rating " + (i + 1);
    }
    
    this.DataViewerFormat_SceneRatingName0 = function() {
        return this.DataViewerFormat_SceneRatingName(0);
    }
    
    this.DataViewerFormat_SceneRatingName1 = function() {
        return this.DataViewerFormat_SceneRatingName(1);
    }
    
    this.DataViewerFormat_SceneRatingName2 = function() {
        return this.DataViewerFormat_SceneRatingName(2);
    }
    
    this.DataViewerFormat_SceneRatingName3 = function() {
        return this.DataViewerFormat_SceneRatingName(3);
    }
    
    this.DataViewerFormat_PersonRatingName = function(i) {
        var ratings = this.ProjectData.Customizations.Person.Ratings;
        if (i < ratings.length) {
            return ratings[i].name;
        }
        return "Rating " + (i + 1);
    }
    
    this.DataViewerFormat_PersonRatingName0 = function() {
        return this.DataViewerFormat_PersonRatingName(0);
    }
    
    this.DataViewerFormat_PersonRatingName1 = function() {
        return this.DataViewerFormat_PersonRatingName(1);
    }
    
    this.DataViewerFormat_PersonRatingName2 = function() {
        return this.DataViewerFormat_PersonRatingName(2);
    }
    
    this.DataViewerFormat_PersonRatingName3 = function() {
        return this.DataViewerFormat_PersonRatingName(3);
    }
    
    
}

// Add the initialization functions.
dojo.addOnLoad(function() {
    // **** Load Required Dojo Libraries ****//
    // NOTE: This is done here to speed up load time. Doing it earlier
    // makes it take longer to actually show the 'loading' splash screen,
    // and you sit on a blank screen for a long time.
    var start = new Date().getTime();
    {
        // FUTURE: As long as we are loading from the same domain, these
        // calls are blocking. If we move over to a cross-domain load 
        // (i.e. dojo is retrieved from it's primary site instead) then
        // we have to make sure everything's loaded before we do the other
        // stuff.
        dojo.registerModulePath("my", "../../components")
        
        dojo.require("dojo.parser");
        dojo.require("dijit.Dialog");
        dojo.require("dijit.layout.BorderContainer");
        dojo.require("dijit.layout.ContentPane");
        dojo.require("dijit.layout.AccordionContainer");
        dojo.require("dijit.layout.TabContainer");
        dojo.require("dijit.Toolbar");
        dojo.require("dojo.data.ItemFileWriteStore");
        dojo.require("dijit.tree.ForestStoreModel");
        dojo.require("dijit.Tree");
        dojo.require("dijit.Declaration");
        dojo.require("dojox.json.schema");
        dojo.require("dijit.form.DropDownButton")
        dojo.require("dijit.Menu");
        dojo.require("dijit.tree.dndSource");
        dojo.require("dijit.TitlePane");
        dojo.require("dojo.data.ItemFileReadStore");
        dojo.require("dijit.form.TextBox");
        dojo.require("dijit.form.TimeTextBox");
        dojo.require("dijit.form.Button");
        dojo.require("dijit.form.DropDownButton");
        dojo.require("dijit.Calendar");
        dojo.require("dijit._TimePicker");
		dojo.require("dojox.editor.plugins.TablePlugins");
		dojo.require("dojox.editor.plugins.PrettyPrint");
		dojo.require("dojo.io.script");
        dojo.require("my.Editors");
        
        
        // app-specific widgets.
        dojo.require("my.LocalFileAccess");
        dojo.require("my.Settings");
        dojo.require("my.ProjectData")
        dojo.require("my.DataItemViewer");
        dojo.require("my.extensions");
        dojo.require("my.GoalHistoryChart");
        dojo.require("my.GoalProgress");
        dojo.require("my.DataGrid");
        // FUTURE: Plugin hook: required-libraries - should go here.
    
    
    
    }
    
    // Now, add another onload here to make sure any asynchronous requests in the requires
    // above are loaded.
    dojo.addOnLoad(function() {
        console.info("Total load time: " + (new Date().getTime() - start) + "ms");
        // ******* Parse the file for declarative dojo widgets ****//
        start = new Date().getTime();
        {
            // FUTURE: Plugin Hook: modify web page - should go here.
            dojo.parser.parse(dojo.byId('container'));
            // FUTURE: Plugin Hook: post process parsing - should go here.
        }
        console.info("Total parse time: " + (new Date().getTime() - start) + "ms");
        
        
        start = new Date().getTime();
        {
            Controller.Initialize();
            
            // FUTURE: Plugin Hook: application controller initialized.
        
        }
        console.info("Total initialization time: " + (new Date().getTime() - start) + "ms");
        
        // go into unloaded state.
        Controller._startUnloadedMode();
        
        
        start = new Date().getTime();
        {
            // ******* Remove the loader screen **** //   
            // make sure other stuff can be shown once the splash screen is removed.
            dojo.removeClass("main", "hideOnLoad");
            dojo.removeClass("resources", "hideOnLoad");
            
            // NOTE: this appears to be necessary since the objects started out hidden,
            // and therefore aren't properly laid out. Not exactly sure why it has to 
            // be done twice. 
            // The first time lays out the panes in the border container.
            dijit.byId("main").resize();
            // The second time clears out some extra space under the toolbar.
            dijit.byId("main").resize();
            
            // FUTURE: Plugin Hook: update controls -- should go here.
            // FUTURE: Here is where UI positions should be applied as well.
        }
        console.info("Total display time: " + (new Date().getTime() - start) + "ms");
        
        
        // close loader, do this after initialization to make sure there isn't anything
        // else that has to be finished first.
        setTimeout(function hideLoader() {
            var loader = dojo.byId('loader');
            dojo.fadeOut({
                node: loader,
                duration: 500,
                onEnd: function() {
                    loader.style.display = "none";
                    
                }
            }).play();
        }, 1);
    });
});
