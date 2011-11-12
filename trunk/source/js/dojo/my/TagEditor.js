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
dojo.provide("my.TagEditor");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.MultiSelect");
dojo.require("dijit.form.ToggleButton");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.ComboBox");
dojo.require("dojo.data.ItemFileReadStore");
dojo.declare("my.TagEditor", [dijit._Widget, dijit._Templated], {

    constructor: function(args) {
        this.tags = [];
        this._tagWidgets = [];
        this._newTagCombo = null;
        
    },
    
    disabled: false,
    
    getTagStoreScope: null,
    
    getTagStore: "",
    
    _setTagsAttr: function(tags) {
        if ((!tags) && (!dojo.isArray(tags))) {
            this.tags = [];
        } else {
            this.tags = tags;
        }
        this._refreshTagButtons();
    },
    
    _refreshTagButtons: function() {
        while (this._tagWidgets.length > 0) {
            this._tagWidgets.pop().destroyRecursive();
        }
        for (var i = 0; i < this.tags.length; i++) {
            var button = new dijit.form.ToggleButton({
                showLabel: true,
                checked: false,
                label: this.tags[i],
                iconClass: "dijitCheckBoxIcon"
            });
            button.placeAt(this._tagsBox);
            this._tagWidgets.push(button);
        }
        if ((this._tagWidgets.length > 0) && (!this.disabled)) {
            this._deleteButton.set('style', "display: inline;");
        } else {
            this._deleteButton.set('style', "display: none;");
        }
    },
    
    _setTagStoreAttr: function(tagStore) {
        if (this._newTagCombo) {
            this._newTagCombo.destroyRecursive(true);
            this._newTagCombo = null;
        }
        this.tagStore = tagStore;
        this._newTagCombo = new dijit.form.ComboBox({
            autocomplete: true,
            store: this.tagStore,
            name: "name",
            searchAttr: "name",
            disabled: this.disabled,
            style: {
                width: "100px"
            }
        }, this._newTagPlace);
        if ((!this.disabled)) {
            this._newTagCombo.set('style', "display: inline-block;");
        } else {
            this._newTagCombo.set('style', "display: none;");
        }
    },
    
    _addTag: function(tag) {
        var tag = tag.trim();
        if ((dojo.indexOf(this.tags, tag) == -1) && (tag != "")) {
            this.tags.push(tag);
            this._refreshTagButtons();
            this.onChange();
            this.tagStore.fetchItemByIdentity({
                identity: tag,
                onItem: dojo.hitch(this, function(item) {
                    if (!item) {
                        this.tagStore.newItem({
                            name: tag
                        })
                    }
                }),
                onError: function(ex) {
                    console.error("Error adding tag: " + tag);
                }
                // ignore errors, although it'd be nice
            })
        }
    },
    
    _getTagsAttr: function() {
        return this.tags;
    },
    
    _setDisabledAttr: function(value) {
        this.disabled = value;
        for (var i = 0; i < this._tagWidgets.length; i++) {
            this._tagWidgets[i].set('disabled', this.disabled);
        }
        if ((this._tagWidgets.length > 0) && (!this.disabled)) {
            this._deleteButton.set('style', "display: inline;");
        } else {
            this._deleteButton.set('style', "display: none;");
        }
        if ((!this.disabled)) {
            this._addButton.set('style', "display: inline;");
            this._newTagCombo.set('style', "display: inline-block;");
        } else {
            this._addButton.set('style', "display: none;");
            this._newTagCombo.set('style', "display: none;");
        }
    },
    
    _getDisabledAttr: function(value) {
        return this.disabled;
    },
    
    templatePath: dojo.moduleUrl("my", "TagEditor.html"),
    
    widgetsInTemplate: true,
    
    _deleteTagsClick: function() {
        var removeTags = [];
        for (var i = 0; i < this._tagWidgets.length; i++) {
            if (this._tagWidgets[i].get('checked')) {
                removeTags.push(this._tagWidgets[i].get('label'));
            }
        }
        if (removeTags.length > 0) {
            for (var i = 0; i < removeTags.length; i++) {
                var tagIndex = dojo.indexOf(this.tags, removeTags[i]);
                if (tagIndex > -1) {
                    this.tags.splice(tagIndex, 1);
                }
            }
            this._refreshTagButtons();
            this.onChange();
        }
        
    },
    
    _addTagClick: function() {
        var newTag = this._newTagCombo.get('value');
        this._addTag(newTag);
    },
    
    postCreate: function() {
        this.inherited(arguments);
        var n = 0;
        if (!this.tagStore) {
            if (this.getTagStoreScope && typeof this.getTagStoreScope == "string") {
                this.getTagStoreScope = dojo.getObject(this.getTagStoreScope) || dojo.global;
            }
            if (!this.getTagStoreScope) {
                this.getTagStoreScope = dojo.global;
            }
            if (this.getTagStore && typeof this.getTagStore == "string") {
                this.getTagStore = this.getTagStoreScope[this.getTagStore];
            }
            if (this.getTagStore) {
                this._setTagStoreAttr(this.getTagStore.apply(this.getTagStoreScope, []));
            }
        } else {
            this._setTagStoreAttr(this.tagStore);
        }
        this._setTagsAttr(this.tags);
    },
    
    onChange: function() {
        // stub function for attaching listeners.
    }
    
    
});
