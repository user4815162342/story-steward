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
        name: "my-dojo.js",
        dependencies: [
		   "dojo.parser", 
		   "dijit.Dialog", 
		   "dijit.layout.BorderContainer", 
		   "dijit.layout.ContentPane", 
		   "dijit.layout.AccordionContainer", 
		   "dijit.layout.TabContainer",
		   "dijit.Toolbar",
		   "dojo.data.ItemFileWriteStore",
		   "dijit.tree.ForestStoreModel",
		   "dijit.Tree",
		   "dijit.Declaration",
		   "dojox.json.schema",
		   "dijit.form.DropDownButton",
		   "dijit.Menu",
		   "dijit.tree.dndSource",
		   "dijit.TitlePane",
		   "dojox.grid.EnhancedGrid",
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
		   "dojo.date.locale",
		   "dijit.Editor",
		   "dijit._editor.plugins.AlwaysShowToolbar",
		   "dijit._editor.plugins.LinkDialog",
		   "dijit._editor.plugins.TextColor",
		   "dijit._editor.plugins.FullScreen",
		   "dojo.data.ItemFileReadStore",
		   "dijit.form.MultiSelect",
		   "dijit.form.ToggleButton",
		   "dijit.form.ComboBox",
		   "dijit.ProgressBar",
		   "dojox.gfx.svg", // Apparently required for Chart2D, but loaded dynamically.
		   "dojox.charting.widget.Chart2D",
		   "dojox.charting.themes.Distinctive"
		    ]
    
    }],
    
    prefixes: [
       [ "dijit", "../dijit" ],
       [ "dojox", "../dojox" ]
   ]

}
