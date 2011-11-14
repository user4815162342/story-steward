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
dependencies = {

    layers: [{
		// NOTE: I need to put this in a separate layer to ensure that I can
		// include the dojofixup stuff prior to loading my required files.
        name: "dojo-core.js",
		localeList: "en-gb,en-us",
        dependencies: [
		   "dojo.parser", 
		   "dojo.data.ItemFileWriteStore",
		   "dojo.date.locale",
		   "dojo.data.ItemFileReadStore",
		   "dojo.io.script"
		    ]
    
    },{
        name: "dijit.js",
		layerDependencies: ["dojo-core.js"],
		localeList: "en-gb,en-us",
        dependencies: [
		   "dijit.Dialog", 
		   "dijit.layout.BorderContainer", 
		   "dijit.layout.ContentPane", 
		   "dijit.layout.AccordionContainer", 
		   "dijit.layout.TabContainer",
		   "dijit.Toolbar",
		   "dijit.tree.ForestStoreModel",
		   "dijit.Tree",
		   "dijit.Declaration",
		   "dijit.form.DropDownButton",
		   "dijit.Menu",
		   "dijit.tree.dndSource",
		   "dijit.TitlePane",
		   "dijit._Widget",
		   "dijit._Templated",
		   "dijit.InlineEditBox",
		   "dijit.form.TextBox",
		   "dijit.form.CheckBox",
		   "dijit.form.DateTextBox",
		   "dijit.form.TimeTextBox",
		   "dijit.form.NumberTextBox",
		   "dijit.form.Button",
		   "dijit.Calendar",
		   "dijit._TimePicker",
		   "dijit.form.HorizontalSlider",
		   "dijit.Editor",
		   "dijit._editor.plugins.AlwaysShowToolbar",
		   "dijit._editor.plugins.LinkDialog",
		   "dijit._editor.plugins.TextColor",
		   "dijit._editor.plugins.FullScreen",
		   "dijit.form.MultiSelect",
		   "dijit.form.ToggleButton",
		   "dijit.form.ComboBox",
		   "dijit.ProgressBar"
		    ]
    
    },{
        name: "dojox.js",
		layerDependencies: ["dojo-core.js","dijit.js"],
		localeList: "en-gb,en-us",
        dependencies: [
		   "dojox.json.schema",
		   "dojox.grid.EnhancedGrid",
		   "dojox.charting.widget.Chart2D",
		   "dojox.charting.themes.Distinctive",
		   "dojox.editor.plugins.TablePlugins",
		   "dojox.editor.plugins.PrettyPrint",
		   "dojo.io.script"
		    ]
    
    },{
		name: "storysteward.js",
		layerDependencies: ["dojo-core.js","dijit.js","dojox.js"],
		dependencies: [
		   "my.Editors",
           "my.LocalFileAccess",
		   "my.Settings",
		   "my.ProjectData",
           "my.DataItemViewer",
           "my.extensions",
           "my.GoalHistoryChart",
           "my.GoalProgress",
           "my.DataGrid"
		],
	}],
    
    prefixes: [
       [ "dijit", "../dijit" ],
       [ "dojox", "../dojox" ],
	   [ "my", "../../../source/js/dojo/my", "../../../../source/js/dojo/my/copyright.txt" ]
   ]

}
