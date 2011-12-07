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
dojo.provide("my.screens.GoalViewer");
dojo.require("my.DataItemViewer");

dojo.declare("my.screens.GoalViewer", [my.DataItemViewer], {

	constructor: function(args) {
		this.templatePath = dojo.moduleUrl("my.screens", "GoalViewer.html")
		
	},
	
	BindData: function(dataStore, dataItem) {
		this.inherited(arguments);
		
		this._refreshHistory(dataStore, dataItem);
		
		this.connect(this, "_ItemChanged", dojo.hitch(this, function(item, attribute, oldValue, newValue) {
			switch (attribute) {
				case "starting":
				case "ending":
					if ((oldValue && oldValue.getTime()) == (newValue && newValue.getTime())) {
						return;
					}
				case "whatStatus":
				case "where":
				case "what":
					if (oldValue == newValue) {
						return;
					}
					this._refreshHistory(dataStore, dataItem);
					break;
			}
			
			
		}));
		
		var historyChanged = dojo.hitch(this, function() {
			// TODO: In theory, I should only call this if the data is
			// actually part of the range... but I don't know.
			this._refreshHistory(dataStore, dataItem);
		})
		
		// Need to update when history has changed. Really, the only way the history
		// can change is when the current entry has changed. Adding a new entry will
		// mean it's the new current entry. Loading will only happen when a new document
		// is loaded, at which point, this tab should not be visible.
		this.connect(Controller.ProjectData.History, "currentEntryUpdated", historyChanged);
		
	},
	
	_refreshHistory: function(dataStore, dataItem) {
	
	
		// TODO: There's got to be a better way to do this, so I don't
		// have to use an ItemFileReadStore here... Can I create a grid that
		// looks like a dojox.grid, but doesn't get data from a store?
		
		this._historyData = Controller.ProjectData.History.getHistoryDataForGoal(dataItem);
		var newStore = new dojo.data.ItemFileReadStore({
			data: {
				identifier: "uid",
				label: "when",
				// Need to 'clone' the array so that I can re-use it for the progress.
				items: dojo.map(this._historyData.entries,function(item) {
					return {
						uid: item.uid,
						when: item.when,
						count: item.count
					}
				})
			}
		});
		var grid = this._historyGrid;
		grid.setStore(newStore);

		var progress = this._goalProgress;
		progress.setHistoryData(this._historyData);
	}
	
	
});

