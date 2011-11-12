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
dojo.provide("my.DataItemViewer");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojo.date.locale");
// The following are 'modified' by extensions
dojo.require("dijit.InlineEditBox");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.HorizontalSlider");
dojo.require("dijit.Editor");
dojo.require("dojox.grid.DataGrid");
dojo.require("my.TagEditor");


dojo.declare("my.DataItemViewer", [dijit.layout.ContentPane, dijit._Templated], {

    /* NOTE: Need this in order for the form attribute to be set declaratively */
    form: "",
    
    bindScope: null,
    
    constructor: function(args) {
        // NOTE: Anything declared using dojo.declare will have a dojo.isInstanceOf() method. So,
        // I can check for known widgets. I'll only support widgets as I find that I need them in
        // this application, rather than adding support for everything now.
        // - dijit.form.CheckBox
        // - dijit.inline.EditBox (looking up appropriate type if necessary)
        // - dijit.form.TextBox 
        // - dijit.Editor
        // - my.TagEditor
        // - dojox.grid.EnhancedGrid (or dojox.grid.DataGrid) -- Although I still have to work out
        //   exactly how this is handled. 
        // - any non-Widget HTML code, where I will simply apply the value to InnerHTML and not allow
        //   changing.
        // Then, I can use that mapping to apply values, watch for changes in the datastore and reapply
        // values, and to retrieve values in onchange.
        this.dataItem = args.dataItem;
        this.dataStore = args.dataStore;
        this.form = args.form;
        this.bindScope = args.bindScope;
        //Establish template. this will be parsed later.
        if (this.form) {
            // NOTE: This is done to keep the custom builder from attempting
            // to intern this template, and failing.
            var dm = dojo.moduleUrl;
            this.templatePath = dm("my.screens", this.form + ".html");
        }
        
    },
    
    IsEditing: function() {
        return this._dataItemEditing();
    },
    
    ApplyEditing: function() {
        var result = this._dataItemSave();
        if (!result) {
            result = new dojo.Deferred();
            result.callback();
        }
        return result;
    },
    
    CancelEditing: function() {
        var result = this._dataItemCancel();
        if (!result) {
            result = new dojo.Deferred();
            result.callback();
        }
        return result;
    },
    
    
    widgetsInTemplate: true,
    
    _getBindFormattersForType: function(dataType) {
        var result = {};
        switch (dataType) {
            case "Date":
                return {
                    formatForGui: function(value) {
                        if (value) {
                            return dojo.date.locale.format(value);
                        }
                        return "";
                        
                    },
                    formatForData: function(value) {
                        if (value) {
                            return dojo.date.locale.parse(value);
                        }
                        return null;
                    },
                    defaultValue: new Date()
                };
        }
        
    },
    
    _bindAttachPoint: function(attachPoint, dataCanWrite, dataCanNotify) {
        var guiObject = this[attachPoint];
        
        if (guiObject._dataItemBind) {
            // NOTE: The above check just tests for the existence of the function,
            // not whether it's true.
            // Most widgets are not able to bind and will raise an error in bind,
            // until that widget has been extended to handle the binding correctly.
            // If you can't bind it yet, don't set it's bindField property.
            if (guiObject.bindField) {
                if ((!guiObject.bindFormatForGui || !guiObject.bindFormatForData || !guiObject.bindDefaultValue) && guiObject.bindDataType) {
                    var formatter = this._getBindFormattersForType(guiObject.bindDataType);
                    if (!guiObject.bindFormatForGui) {
                        guiObject.bindFormatForGui = formatter.formatForGui;
                    }
                    if (!guiObject.bindFormatForData) {
                        guiObject.bindFormatForData = formatter.formatForData;
                    }
                    if (!guiObject.bindDefaultValue) {
                        guiObject.bindDefaultValue = formatter.bindDefaultValue;
                    }
                }
                
                guiObject._dataItemBind(this.dataStore, this.dataItem, this.bindScope, this);
				// if it supports the 'editing' interface, then watch for these things.
                if (guiObject._dataItemEditing &&
                guiObject._dataItemSave &&
                guiObject._dataItemCancel) {
                    if (!this._editors) {
                        this._editors = [];
                    }
                    this._editors.push(guiObject);
                    
                }
            }
        } else {
            var bindField = dojo.attr(guiObject, 'bindField');
            if (bindField) {
                // bind to a DOM Node.
                var defaultValue = dojo.attr(guiObject, "bindDefaultValue");
                var formatForGui = dojo.attr(guiObject, "bindFormatForGui");
                if (!formatForGui) {
                    var dataType = dojo.attr(guiObject, "bindDataType");
                    if (dataType) {
                        var formatters = this._getBindFormattersForType(dataType);
                        formatForGui = formatters.formatForGui;
                        if (!defaultValue) {
                            defaultValue = formatters.defaultValue;
                        }
                    }
                } else if (formatForGui && typeof formatForGui === "string") {
                    formatForGui = this.bindScope[formatForGui];
                }
                
                var dataStoreOnSet;
                if (formatForGui) {
                    dataStoreOnSet = function(item, attribute, oldValue, newValue) {
                        dojo.when(formatForGui.apply(this.bindScope, [newValue]), dojo.hitch(this, function(values) {
                            var value;
                            if (dojo.isArray(values)) {
                                if (values.length) {
                                    value = values[0];
                                } else {
                                    value = defaultValue;
                                }
                            } else {
                                value = values;
                            }
                            guiObject.innerHTML = value;
                        }), dojo.hitch(this, function(ex) {
                            alert(ex);
                        }))
                    };
                } else {
                    dataStoreOnSet = function(item, attribute, oldValue, newValue) {
                        var newValue;
                        if (dojo.isArray(newValue)) {
                            if (newValue.length) {
                                value = newValue[0];
                            } else {
                                newValue = defaultValue;
                            }
                        } else {
                            value = newValue;
                        }
                        guiObject.innerHTML = newValue;
                    };
                }
                // initialize the data...
                dataStoreOnSet.apply(this, [this.dataItem, bindField, null, this.dataStore.getValue(this.dataItem, bindField, defaultValue)]);
                // connect to the database.
                var bindAll = dojo.attr(guiObject, "bindAll");
                if (dataCanNotify) {
                    if (bindAll) {
                        this.connect(this, "_ItemChanged", function(item, attribute, oldValue, newValue) {
                            if (attribute == bindField) {
                                dataStoreOnSet.apply(this, [item, attribute, oldValue, newValue]);
                            } else {
                                var values = this.dataStore.getValues(this.dataItem, bindField);
                                dataStoreOnSet.apply(this, [item, attribute, values, values]);
                            }
                        });
                    } else {
                        this.connect(this, this.GetAttributeOnSet(bindField), dataStoreOnSet);
                    }
                    
                }
            }
            
        }
        
    },
    
    GetAttributeOnSet: function(attribute) {
        return "on" + attribute + "set";
    },
    
    BindData: function(dataStore, dataItem) {
        if (this._bound) {
            throw "DataItemViewer is already bound.";
        }
        this.dataStore = dataStore;
        var dataCanWrite = this.dataStore.getFeatures()['dojo.data.api.Write'] == true;
        var dataCanNotify = this.dataStore.getFeatures()['dojo.data.api.Notification'] == true;
        
        this.dataItem = dataItem;
        
        // look for a bind scope on the template.
        if (!this.bindScope) {
            this.bindScope = dojo.attr(this.containerNode, "bindScope");
        }
        
        if (this.bindScope && typeof this.bindScope == "string") {
            this.bindScope = dojo.getObject(this.bindScope) || dojo.global;
        }
        
        if (!this.bindScope) {
            this.bindScope = dojo.global;
        }
        
        if (!this.titleField) {
            this.titleField = dojo.attr(this.containerNode, "titleField");
        }
        
        this._defaultTitle = this.title;
        if (!this._defaultTitle) {
            this._defaultTitle = dojo.attr(this.containerNode, "defaultTitle");
        }
        
        if (this.titleField) {
            this.set("title", this.dataStore.getValue(this.dataItem, this.titleField, this._defaultTitle));
        }
        
        for (var i = 0; i < this._attachPoints.length; i++) {
            this._bindAttachPoint(this._attachPoints[i], dataCanWrite, dataCanNotify);
        }
        
        // NOTE: Use this instead of dojo.connect, as it will automatically
        // be disconnected when the widget dies.
        
        if (dataCanNotify) {
            this.connect(this.dataStore, "onSet", this._DataStoreChanged);
            // onNew is required because creating a new child on an attribute
            // does not call onSet.
            this.connect(this.dataStore, "onNew", this._DataStoreNew)
            // onDelete is only for this item. Children being deleted will
            // should still cause an onSet for the appropriate attribute.
            this.connect(this.dataStore, "onDelete", this._DataItemDeleted);
            
            
        }
        this._bound = true;
        
    },
    
    GetRawFieldValue: function(attribute) {
        var result = [];
        for (var i = 0; i < this._editors.length; i++) {
            if ((this._editors[i].bindField == attribute) && this._editors[i]._dataItemGet) {
                var value = this._editors[i]._dataItemGet();
                if (dojo.indexOf(result, value) == -1) {
                    result.push(value);
                }
            }
        }
        switch (result.length) {
            case 0:
                return undefined;
            case 1:
                return result[0];
            default:
                return result;
        }
        
    },
    
    postCreate: function() {
        this.inherited(arguments);
        if (this.dataStore && this.dataItem) {
            this.BindData(this.dataStore, this.dataItem);
        }
    },
    
    DeleteDataItem: function() {
        // NOTE: Have to call this on controller, since delete does
        // not call onDelete for all of the children, so the controller
        // has no way to know whether tabs open for those children should
        // be closed or not. 
        Controller.DeleteItem(this.dataItem);
    },
    
    _ItemChanged: function(item, attribute, oldValue, newValue) {
        if (attribute == this.titleField) {
            this.set("title", newValue || this._defaultTitle);
        }
        // This improves things, as the fields only need to listen
        // to changes on their own field, instead of every single
        // field.
        var method = this.GetAttributeOnSet(attribute);
        if (this[method]) {
            this[method](item, attribute, oldValue, newValue);
        }
    },
    
    _DataStoreChanged: function(item, attribute, oldValue, newValue) {
        if (item == this.dataItem) {
            this._ItemChanged(item, attribute, oldValue, newValue);
        }
    },
    
    _DataStoreNew: function(item, parentInfo) {
        // if a new item is added as a child of this one, that's equivalent
        // to changing the item's attribute value.
        if (parentInfo && (parentInfo.item == this.dataItem)) {
            this._ItemChanged(parentInfo.item, parentInfo.attribute, parentInfo.oldValue, parentInfo.newValue);
        }
    },
    
    _DataItemDeleted: function(item) {
        if (item == this.dataItem) {
            this.DataItemRemoved();
        }
        // if it's a child item being deleted, we still get an onSet,
        // so that doesn't have to be done.
    },
    
    DataItemRemoved: function() {
        // NOTE: Stub function for the container to override when the item
        // is deleted and the tab should close completely.
    },
    
    createNewItem: "",
    
    // Let it bind as well. When this is bound to a given dataItem and
    // mapping, it actually binds to the first item of the attribute instead.
    _dataItemBind: function(dataStore, dataItem, formatterScope, viewer) {
        var dataField = this.bindField;
        var items = dataStore.getValues(dataItem, dataField);
        var childItem;
        if (items.length == 0) {
            // FUTURE: Test this sometime.
            
            if (dataStore.getFeatures()['dojo.data.api.Write']) {
                if (this.createNewItem && typeof this.createNewItem == "string") {
                    this.createNewItem = this.bindScope[this.createNewItem];
                }
                childItem = this.createNewItem.apply(this.bindScope, [dataItem, dataField]);
            } else {
                // FUTURE: Should probably disable everything.
            }
        } else {
            if (!dataStore.isItem(items[0])) {
                throw "DataItemViewer must be bound to a child item in the data field."
            }
            childItem = items[0];
        }
        this.BindData(dataStore, childItem)
    },
    
    _dataItemEditing: function() {
        for (var i = 0; i < this._editors.length; i++) {
            if (this._editors[i]._dataItemEditing()) {
                return true;
            }
        }
        return false;
    },
    
    _dataItemSave: function() {
        var savers = [];
        for (var i = 0; i < this._editors.length; i++) {
            if (this._editors[i]._dataItemEditing()) {
                var result = this._editors[i]._dataItemSave();
                if (result) {
                    savers.push(result);
                }
            }
        }
        if (savers.length) {
            return new dojo.DeferredList(savers, false, true);
        }
        
    },
    
    _dataItemCancel: function() {
        var savers = [];
        for (var i = 0; i < this._editors.length; i++) {
            if (this._editors[i]._dataItemEditing()) {
                var result = this._editors[i]._dataItemCancel();
                if (result) {
                    savers.push(result);
                }
            }
        }
        if (savers.length) {
            return new dojo.DeferredList(savers, false, true);
        }
        
    }
    
});


dojo.extend(dijit._Widget, {
    // Some addition attributes to have available on the widget. 
    bindField: "",
    bindAll: false,
    bindFormatForGui: "",
    bindFormatForData: "",
    bindDataType: "",
    bindDefaultValue: "",
    
    _dataItemSetValues: function(newValues, attribute) {
        var value;
        if (dojo.isArray(newValues)) {
            if (newValues.length) {
                value = newValues[0];
            } else {
                value = this.bindDefaultValue || (this._dataItemGet && this._dataItemGet());
            }
        } else {
            value = newValues;
        }
        this._dataItemSet(value, attribute);
    },
    
    _dataItemBind: function(dataStore, dataItem, bindScope, viewer) {
        var dataStoreOnSet;
        var dataCanWrite = this._dataItemGet && this.onChange && (dataStore.getFeatures()['dojo.data.api.Write'] == true);
        var dataCanNotify = dataStore.getFeatures()['dojo.data.api.Notification'] == true;
        
        var formatForGui = this.bindFormatForGui;
        var formatForData = this.bindFormatForData;
        if (formatForGui && typeof formatForGui == "string") {
            formatForGui = bindScope[formatForGui];
        }
        if (formatForData && typeof formatForData == "string") {
            formatForData = bindScope[formatForData];
        }
        
        var formatterState = {};
        
        
        var dataField = this.bindField;
		if (!this._dataItemSet) {
            throw "Can't bind to data: binding implementation is incomplete."
        }
        
        // make these accessible to events.
        this.bindItem = dataItem;
        this.bindStore = dataStore;
        
        if (formatForGui) {
            dataStoreOnSet = function(item, attribute, oldValue, newValue) {
                dojo.when(formatForGui.apply(bindScope, [newValue, formatterState]), dojo.hitch(this, function(values) {
                    this._dataItemSetValues(values, attribute);
                }), dojo.hitch(this, function(ex) {
                    alert(ex);
                }))
            }
        } else {
            dataStoreOnSet = function(item, attribute, oldValue, newValue) {
                this._dataItemSetValues(newValue, attribute);
            }
        }
        var onChange;
        if (dataCanWrite) {
            if (formatForData) {
                onChange = function() {
                    dojo.when(formatForData.apply(bindScope, [this._dataItemGet(), formatterState]), dojo.hitch(this, function(value) {
                        dataStore.setValue(dataItem, dataField, value);
                    }), dojo.hitch(this, function(ex) {
                        alert(ex);
                    }))
                }
            } else {
                onChange = function() {
                    dataStore.setValue(dataItem, dataField, this._dataItemGet());
                }
                
            }
        } 
        // initialize the data...
        dataStoreOnSet.apply(this, [dataItem, dataField, null, dataStore.getValues(dataItem, dataField)]);
        if (dataCanWrite) {
            this.connect(this, "onChange", onChange)
        }
        if (dataCanNotify) {
            if (this.bindAll) {
                this.connect(viewer, "_ItemChanged", function(item, attribute, oldValue, newValue) {
                    if (attribute == this.bindField) {
                        dataStoreOnSet.apply(this, [item, attribute, oldValue, newValue]);
                    } else {
                        var values = dataStore.getValues(dataItem, this.bindField);
                        dataStoreOnSet.apply(this, [item, attribute, values, values]);
                    }
                });
            } else {
                //this.connect(dataStore, "onSet", dataStoreOnSet);
                this.connect(viewer, viewer.GetAttributeOnSet(dataField), dataStoreOnSet);
            }
        }
    }
})

dojo.extend(dijit.form._FormWidget, {
    _dataItemSetDisabled: function() {
        this.set('disabled', true);
    }
})

dojo.extend(dijit.form.CheckBox, {

    _dataItemSet: function(newValue) {
        this.set("checked", newValue ? true : false);
    },
    
    _dataItemGet: function() {
        return this.get("checked");
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
})

dojo.extend(dijit.form.DateTextBox, {

    _dataItemSet: function(newValue) {
        this.set("value", newValue);
    },
    
    _dataItemGet: function() {
        return this.get("value");
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
})

dojo.extend(dijit.form.NumberTextBox, {

    _dataItemSet: function(newValue) {
        this.set("value", newValue);
    },
    
    _dataItemGet: function() {
        return this.get("value");
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
})

dojo.extend(dijit.InlineEditBox, {
    _dataItemSet: function(newValue) {
        this.set("value", dojo.isString(newValue) ? newValue : newValue.toString());
    },
    
    _dataItemGet: function() {
        var value = this.get("value");
        return value;
    },
    
    _dataItemEditing: function() {
        return this.get('editing');
    },
    
    _dataItemSetDisabled: function() {
        this.set('disabled', true);
    },
    
    _dataItemSave: function() {
        this.save();
    },
    
    _dataItemCancel: function() {
        this.cancel();
    }
    
    
    
})

dojo.extend(dijit.Editor, {
    _dataItemSet: function(newValue) {
        this.set("value", newValue || "");
    },
    
    _dataItemGet: function() {
        var value = this.get("value");
        return value;
    },
    
    _dataItemEditing: function() {
        // NOTE: In general, we are editing at only 
        // when the editor has focus. Once it loses
        // focus, the onChange event occurs and the 
        // data is saved. In theory, when the user clicks 
        // the close button on the tab, or
        // even just closes the tab, the editor will lose focus
        // and everything will be updated. 
        return false;
    },
    
    
    
    _dataItemSetDisabled: function() {
        // this.set('disabled', true);
        this.set("disabled", true);
        dojo.style(this.header, "display", "none");
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
    
    
})


dojo.extend(dijit.form.HorizontalSlider, {
    _dataItemSet: function(newValue) {
        this.set("value", newValue || 0);
    },
    
    _dataItemGet: function() {
        var value = this.get("value");
        return value;
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
});

dojo.extend(dojox.grid.DataGrid, {

    _dataItemBind: function(dataStore, dataItem, scope, viewer) {
        var dataField = this.bindField;
        // NOTE: This only works if ItemFileReadStore is extended appropriately to
        // allow these additional arguments. This extension is done in this file
        // to ensure that it gets done, see code at the top of this script.
        this.setStore(dataStore, {}, {
            parentItem: dataItem,
            parentAttribute: dataField
        })
        this._dataItemIsEditing = false;
        this.connect(this, "onStartEdit", function() {
            this._dataItemIsEditing = true;
        });
        this.connect(this, "onApplyEdit", function() {
            this._dataItemIsEditing = false;
        });
        this.connect(this, "onCancelEdit", function() {
            this._dataItemIsEditing = false;
        });
        
    },
    
    _dataItemEditing: function() {
        return this._dataItemIsEditing;
    },
    _dataItemSave: function() {
        // FUTURE: Maybe someday...
    },
    
    _dataItemCancel: function() {
        // FUTURE: Maybe someday...	
    }
    
    
    
})

my.TagEditor.extend({

    _dataItemSetValues: function(newValues) {
        this.set("tags", newValues);
    },
    
    _dataItemSet: function(newValue) {
        throw "Use dataItemSetValues. Should never get here."
    },
    
    _dataItemGet: function() {
        var value = this.get("tags");
        return value;
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSetDisabled: function() {
        this.set('disabled', true);
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
})
