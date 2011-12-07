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
dojo.provide("my.data.History");
dojo.require("my.data.HistoryEntry");
dojo.declare("my.data.History", null, {

	_setCurrentEntry: function(entry) {
		if (entry !== this._currentEntry) {
			if (this._currentEntry) {
				dojo.disconnect(this._currentEntryConnection);
			}
			this._currentEntry = entry;
			if (this._currentEntry) {
				this._currentEntryConnection = dojo.connect(entry, "updated", dojo.hitch(this, this.currentEntryUpdated));
			}
			// call this to alert the change.
			this.currentEntryUpdated();
		}
		
	},
	
	constructor: function(args) {
		this._projectData = args.projectData;
		if (args.serialized) {
			this.load(args.serialized);
		} else {
			this._clear();
		}
		
	},
	
	_clear: function() {
		this._setCurrentEntry(null);
		this._data = [];
		this._index = {};
	},
	
	deserialize: function(serialized) {
		this._clear();
		if (serialized) {
			if (typeof serialized == "string") {
				serialized = dojo.fromJson(serialized);
			}
			var today = new Date();
			today.setHours(0, 0, 0, 0);
			for (var i = 0; i < serialized.length; i++) {
				var entry = new my.data.HistoryEntry({
					serialized: serialized[i]
				});
				this._data.push(entry);
				this._index[entry.getUID()] = entry;
				this.entryAdded(entry);
				if (dojo.date.compare(entry.getWhen(), today) === 0) {
					this._setCurrentEntry(entry);
					this._currentEntry = entry;
				}
				
			}
			// sort this to make the binary search easy. I'm assuming
			// it's already sorted since it would have been saved in
			// sorted format, but you never know...
			this._data.sort(function(a, b) {
				return dojo.date.compare(a.getWhen(), b.getWhen());
			})
			
			this.loaded();
			
		}
		
	},
	
	serialize: function() {
		var result = [];
		for (var i = 0; i < this._data.length; i++) {
			result.push(this._data[i].serialize());
		}
		return result;
	},
	
	getLength: function() {
		return this._data.length;
	},
	
	get: function(index) {
		return this._data[index];
	},
	
	getByUID: function(uid) {
		return this._index[uid];
	},
	
	getRange: function(starting, ending) {
		// Need to build a regex string that matches all dates within the range.
		starting = starting || new Date(0);
		ending = ending || new Date();
		
		var compare = function(a, b) {
			return dojo.date.compare(a.getWhen(), b, "date");
		};
		
		var result = {
			entries: []
		};
		
		var startIndex = my.utilities.search(this._data, starting, {
			comparator: compare,
			returnInsertIndex: true
		});
		if (startIndex < this._data.length) {
			var endIndex = my.utilities.search(this._data, ending, {
				comparator: compare,
				returnPriorIndex: true
			});
			if ((endIndex >= 0) && (endIndex >= startIndex)) {
				result.entries = this._data.slice(startIndex, endIndex + 1);
			} // else end is before entire range
		} // else start is after entire range
		// Finally, if there are no entries, then we may need to return the
		// entry prior to the first, if at all possible, in case the
		// user wants to know the last history to get recent totals.
		if ((this._data.length > 0) && (startIndex > 0)) {
			result.lastEntryPriorToRange = this._data[Math.min(startIndex - 1, this._data.length - 1)];
		}
		return result;
	},
	
	getHistoryDataForGoal: function(goal) {
		var starting = this._projectData.ProjectStore.getValue(goal,"starting",null);
		if (!starting) {
			starting = this._projectData.ProjectStore.getValue(goal,"created",null);
			// if this is null, highly unlikely, will start at the '0' date, so we don't need to worry.
		}
		
		var ending = this._projectData.ProjectStore.getValue(goal,"ending",null);
		// if this is null, the ending will be 'today'.
		
		var whatStatus = this._projectData.ProjectStore.getValue(goal,"whatStatus",null);
		var bookOrPart = this._projectData.ProjectStore.getValue(goal,"where",null);
		var what = this._projectData.ProjectStore.getValue(goal,"what","words");
		var startingCount = this._projectData.ProjectStore.getValue(goal,"startingCount",0);
		var targetCount = this._projectData.ProjectStore.getValue(goal,"targetCount",0); 
		
		var getCountValue = function(entry) {
			var request = {};
			if (bookOrPart) {
				request.bookOrPart = bookOrPart;
			}
			if (whatStatus) {
				request.status = whatStatus;
			}
			var f;
			switch (what) {
				case "words":
				   f = entry.getTotalWordCount;
				   break;
				case "scenes":
				   f = entry.getTotalSceneCount;
				   break;
				case "chapters":
				   f = entry.getTotalChapterCount;
				   break;
			}
			return f.apply(entry,[request]);
		} 
		
		
		
		var range = this.getRange(starting,ending);
		
		return {
			starting: starting,
			ending: ending,
			whatStatus: whatStatus,
			where: bookOrPart,
			what: what,
			startingCount: startingCount || (range.lastEntryPriorToRange && getCountValue(range.lastEntryPriorToRange)) || 0,
			entries: dojo.map(range.entries,function(item) {
				return {
					uid: item.getUID(),
					when: item.getWhen(),
					count: getCountValue(item) 
				}
			}),
			targetCount: targetCount
		}
		
		
	},
	
	getLastEntryPriorTo: function(when) {
		var compare = dojo.hitch(this, function(a, b) {
			return dojo.date.compare(a.getWhen(), b, "date");
		})
		
		var index = my.utilities.search(this._data, when, {
			comparator: compare,
			returnPriorIndex: true
		});
		if (index > -1) {
			return this._data[index];
		}
		return null;
		
	},
	
	getCurrentEntry: function() {
		if (this._currentEntry) {
			// Don't bother putting on a timer, since I want things to display the
			// current entry until it is saved.
			var today = new Date();
			today.setHours(0, 0, 0, 0);
			if (dojo.date.compare(this._currentEntry.getWhen(), today, "date") !== 0) {
				this._setCurrentEntry(null);
			}
		}
		return this._currentEntry || null;
	},
	
	getCurrentOrPriorEntry: function() {
		var result = this.getCurrentEntry();
		if ((!result) && (this._data.length > 0)) {
			// Don't need to search by date, since the last one should always be
			// the youngest.
			return this._data[this._data.length - 1];
		}
		return result;
	},
	
	updateOrCreateCurrentEntry: function() {
		var result = new dojo.Deferred();
		try {
			var answer = this.getCurrentEntry();
			var isNew = !answer;
			if (isNew) {
				this._data.push(answer = new my.data.HistoryEntry());
				this._index[answer.getUID()] = answer;
				// in theory, I don't need to sort, since this should always be the last one.
			}
			answer.updateFromContent(this._projectData).then(dojo.hitch(this, function() {
				if (isNew) {
					this.entryAdded(answer);
					this._setCurrentEntry(answer);
				}
				result.callback(answer);
			}), function(ex) {
				result.errback(ex);
			})
			
		} catch (ex) {
			result.errback(ex);
		}
		return result;
	},
	
	entryAdded: function(entry) {
		// A stub function to be called when an item is added. This
		// can be used for events.
	},
	
	currentEntryUpdated: function(entry) {
		// A stub function called when the current entry changes or is replaced.
	
	},
	
	loaded: function() {
		// A stub function to be called when the history is completely re-loaded.
	}
	
	
});
