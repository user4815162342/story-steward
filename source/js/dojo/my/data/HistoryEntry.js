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
dojo.provide("my.data.HistoryEntry");
dojo.declare("my.data.HistoryEntry", null, {
	/* NOTE: 
	 * For easier access to values, and minimization of storage, all data is stored
	 * in objects keyed by book or part uid and then status, as appropriate. For statistics
	 * which don't apply to a specific book or part or status, a blank string is used
	 * for the key to represent 'unknown'. This reduces the number of lines of code
	 * being used by preventing the need for conditionals which determine which variable
	 * to check... instead, only one variable has to be checked all of the time. 
	 */
	
	_resetData: function() {
		this._parents = {};
		this._chapters = {};
		this._scenes = {};
		this._words = {};
		this._booksAndParts = [];
		this._statuses = {};
		this._totalScenes = {
			all: 0,
			byBookOrPart: {},
			byStatus: {}
		};
		this._totalWords = {
			all: 0,
			byBookOrPart: {},
			byStatus: {}
		};
		this._totalChapters = {
			all: 0,
			byBookOrPart: {}
		};
	},
	
	_loadIncCounts: function(uid, parentUid, status, type, value) {
		if (!this[type][uid]) {
			this[type][uid] = {};
		}
		this[type][uid][status] = (this[type][uid][status] || 0) + value;
		var totalType = type == "_scenes" ? "_totalScenes" : "_totalWords";
		this[totalType].all += value;
		if (!this[totalType].byBookOrPart[uid]) {
			this[totalType].byBookOrPart[uid] = {
				all: value,
				byStatus: {}
			}
		} else {
			this[totalType].byBookOrPart[uid].all += value;
		}
		this[totalType].byBookOrPart[uid].byStatus[status] = (this[totalType].byBookOrPart[uid].byStatus[status] || 0) + value;
		if (parentUid) {
			if (!this[totalType].byBookOrPart[parentUid]) {
				this[totalType].byBookOrPart[parentUid] = {
					all: value,
					byStatus: {}
				}
			} else {
				this[totalType].byBookOrPart[parentUid].all += value;
			}
			this[totalType].byBookOrPart[parentUid].byStatus[status] = (this[totalType].byBookOrPart[parentUid].byStatus[status] || 0) + value;
		}
		this[totalType].byStatus[status] = (this[totalType].byStatus[status] || 0) + value;
		
	},

	_loadIncChapters: function(uid, parentUid, value) {
		this._chapters[uid] = (this._chapters[uid] || 0) + value;
		this._totalChapters.all += value;
		this._totalChapters.byBookOrPart[uid] = (this._totalChapters.byBookOrPart[uid] || 0) + value;
		if (parentUid) {
			this._totalChapters.byBookOrPart[parentUid] = (this._totalChapters.byBookOrPart[parentUid] || 0) + value;
		}
		
	},

	_deserializeBookOrPartGroup: function(uid, serialized) {
		if (serialized.parent) {
			this._parents[uid] = serialized.parent;
		}
		this._booksAndParts.push(uid);
		this._statuses[uid] = [];
		this._totalScenes.byBookOrPart[uid] = {
			all: 0,
			byStatus: {}
		}
		this._loadIncChapters(uid || "", serialized.parent || "", serialized.chapters || 0);
		if (serialized.noStatus) {
			this._statuses[uid].push("");
			this._loadIncCounts(uid || "", serialized.parent || "", "", "_scenes", serialized.noStatus.scenes || 0);
			this._loadIncCounts(uid || "", serialized.parent || "", "", "_words", serialized.noStatus.words || 0);
		}
		if (serialized.statuses) {
			for (var status in serialized.statuses) {
				if (serialized.statuses.hasOwnProperty(status)) {
					this._statuses[uid].push(status);
					this._loadIncCounts(uid || "", serialized.parent || "", status || "", "_scenes", serialized.statuses[status].scenes || 0);
					this._loadIncCounts(uid || "", serialized.parent || "", status || "", "_words", serialized.statuses[status].words || 0);
				}
			}
		}
		
	},
	
	constructor: function(/* Object */ args) {
		// summary:
		//   Creates a new History Entry, either from a serialized JSON object, or
		//   with a specified when and date. 
		// arguments:
		//   An object with any of the following properties:
		//     serialized: Either a JSON formatted string, or a JSON object, as specified
		//                 for history entries in the story steward 1.1 project format. If
		//                 this is found, the object will be deserialized from this, and
		//                 all other properties of the argument are ignored.
		//     uid: A unique identifier to use. If this is not specified, and neither is 'serialized',
		//          a new id will be generated.
		//     when: A date indicating when the history entry is good for. If this is not specified,
		//           and neither is 'serialized', then today's date will be used.
		this._resetData();
		args = args || {};
		if (args.serialized) {
			if (typeof args.serialized == "string") {
				args.serialized = dojo.fromJson(args.serialized);
			}
			this._uid = args.serialized.uid;
			this._when = dojo.date.stamp.fromISOString(args.serialized.when);
			
			if (args.serialized.booksAndParts) {
				for (var uid in args.serialized.booksAndParts) {
					if (args.serialized.booksAndParts.hasOwnProperty(uid)) {
						this._deserializeBookOrPartGroup(uid, args.serialized.booksAndParts[uid]);
					}
				}
			}
			if (args.serialized.noBookOrPart) {
				this._deserializeBookOrPartGroup("", args.serialized.noBookOrPart);
			}
			
			
		} else {
			this._uid = args.uid || my.ProjectData.CreateDataUID();
			this._when = args.when ||
			(function() {
				var result = new Date();
				result.setHours(0, 0, 0, 0);
				return result;
			})();
		}
		
	},
	
	getUID: function() {
		// summary: Returns the unique identifier for this entry.
		return this._uid;
	},
	
	getWhen: function() {
		// summary: Returns the date this entry is good for.
		return this._when;
	},
	
	_serializeBookOrPart: function(uid) {
		var result = {};
		
		var isEmpty = true;
		if (this._parents.hasOwnProperty(uid)) {
			result.parent = this._parents[uid];
			isEmpty = false;
		}
		if (this._chapters[uid]) {
			result.chapters = this._chapters[uid];
			isEmpty = false;
		}
		if (this._statuses[uid].length) {
			for (var j = 0; j < this._statuses[uid].length; j++) {
				var status = this._statuses[uid][j];
				var statusResult = {};
				statusResult.words = this._words[uid][status];
				statusResult.scenes = this._scenes[uid][status];
				if (status === "") {
					result.noStatus = statusResult;
				} else {
					result.statuses || (result.statuses = {});
					result.statuses[status] = statusResult;
				}
				isEmpty = false;
			}
		}
		return !isEmpty ? result : null;
	},
	
	serialize: function() {
		// summary: Creates a JSON object to the specification of the story steward 1.1 schema, 
		//          for storage in a project file.
		var result = {
			uid: this._uid,
			when: dojo.date.stamp.toISOString(this._when, {
				selector: "date",
				zulu: true
			})
		}
		
		if (this._booksAndParts.length) {
			for (var i = 0; i < this._booksAndParts.length; i++) {
				var uid = this._booksAndParts[i];
				var bookOrPartResult = this._serializeBookOrPart(uid);
				if (uid === "") {
					if (bookOrPartResult) {
						result.noBookOrPart = bookOrPartResult;
					}
				} else {
					result.booksAndParts || (result.booksAndParts = {});
					// I want an entry for each known book, so that hierarchy can be preserved.
					result.booksAndParts[uid] = bookOrPartResult || {};
				}
			}
		}
		return result;
	},

    _getTotalCount: function(request, type) {
		request = request || {};
		if (typeof request.bookOrPart === "undefined") {
			if (typeof request.status === "undefined") {
				return this[type].all;
			} else {
				return this[type].byStatus[request.status || ""] || 0;
			}
		} else if (typeof request.status === "undefined") {
			return this[type].byBookOrPart[request.bookOrPart || ""].all || 0;
		} else {
			return this[type].byBookOrPart[request.bookOrPart || ""].byStatus[request.status || ""] || 0;
		}
	},
	
	getTotalWordCount: function(request) {
		// summary: Returns the number of words for a given book, part and status.
		// description: Unlike the standard get*Count functions, this does do total
		//              counts -- it includes counts from parts included inside books.
		// argument:
		//    An object representing the request, with the following properties:
		//      bookOrPart: the UID of a book or part to look in. If this is null, 
		//                  or blank, only data outside any book or part will be 
		//                  totalled. If this is undefined, totals will be from 
		//                  all content.
		//      status: The status of words you are interested in. If this is null,
		//              or empty, it will return only the number of words
		//              without a status. If this is undefined, it will return words
		//              across scenes with any or no status.
		return this._getTotalCount(request,"_totalWords");
		
	},
	
	getTotalSceneCount: function(request) {
		// summary: Returns the number of scenes for a given book, part and status.
		// description: Unlike the standard get*Count functions, this does do total
		//              counts -- it includes counts from parts included inside books.
		// argument:
		//    An object representing the request, with the following properties:
		//      bookOrPart: the UID of a book or part to look in. If this is null, 
		//                  or blank, only data outside any book or part will be 
		//                  totalled. If this is undefined, totals will be from 
		//                  all content.
		//      status: The status of scenes you are interested in. If this is null,
		//              or empty, it will return only the number of scenes
		//              without a status. If this is undefined, it will return scenes
		//              with any or no status. 
		return this._getTotalCount(request,"_totalScenes");
		
	},
	
	getTotalChapterCount: function(request) {
		// summary: Returns the number of chapters for a given book, part and status.
		// description: Unlike the standard get*Count functions, this does do total
		//              counts -- it includes counts from parts included inside books.
		// argument:
		//    An object representing the request, with the following properties:
		//      bookOrPart: the UID of a book or part to look in. If this is null, 
		//                  or blank, only data outside any book or part will be 
		//                  totalled. If this is undefined, totals will be from 
		//                  all content.
		request = request || {};
		if (typeof request.bookOrPart === "undefined") {
			return this._totalChapters.all;
		} else {
			return this[type].byBookOrPart[request.bookOrPart || ""] || 0;
		}
	},
	
	getWordCount: function(request) {
		// summary: Returns the number of words for a given book, part and status.
		// description: This does not total the counts. It will only look in the
		//              specified book or part, not in parts that might be contained
		//              within it. 
		// argument:
		//    An object representing the request, with the following properties:
		//      bookOrPart: the UID of a book or part to look in. If this is null,
		//                  empty or undefined, it will return the number of words
		//                  which are outside any book or part.
		//      status: The status of words you are interested in. If this is null,
		//              empty or undefined, it will return only the number of words
		//              without a status. 
		request.bookOrPart = request.bookOrPart || "";
		request.status = request.status || "";
		
		if (this._words.hasOwnProperty(request.bookOrPart)) {
			if (this._words[request.bookOrPart].hasOwnProperty(request.status)) {
				return this._words[request.bookOrPart][request.status];
			} else {
				throw "The history entry for " + this._when + " has no word counts for the specified book or part under that status.";
			}
		} else {
			throw "The history entry for " + this._when + " has no word counts for the specified book or part.";
		}
		
	},
	
	getSceneCount: function(request) {
		// summary: Returns the number of scenes for a given book, part and status.
		// description: This does not total the counts. It will only look in the
		//              specified book or part, not in parts that might be contained
		//              within it. 
		// argument:
		//    An object representing the request, with the following properties:
		//      bookOrPart: the UID of a book or part to look in. If this is null,
		//                  empty or undefined, it will return the number of scenes
		//                  which are outside any book or part.
		//      status: The status of scenes you are interested in. If this is null,
		//              empty or undefined, it will return only the number of scenes
		//              without a status. 
		request.bookOrPart = request.bookOrPart || "";
		request.status = request.status || "";
		
		if (this._scenes.hasOwnProperty(request.bookOrPart)) {
			if (this._scenes[request.bookOrPart].hasOwnProperty(request.status)) {
				return this._scenes[request.bookOrPart][request.status];
			} else {
				throw "The history entry for " + this._when + " has no scene counts for the specified book or part under that status.";
			}
		} else {
			throw "The history entry for " + this._when + " has no scene counts for the specified book or part.";
		}
		
	},
	
	getChapterCount: function(request) {
		// summary: Returns the number of scenes for a given book, part and status.
		// description: This does not total the counts. It will only look in the
		//              specified book or part, not in parts that might be contained
		//              within it. 
		// argument:
		//    An object representing the request, with the following properties. This
		//    is defined as an object to be compatible with other get*Count methods.
		//      bookOrPart: the UID of a book or part to look in. If this is null,
		//                  empty or undefined, it will return the number of scenes
		//                  which are outside any book or part.
		request.bookOrPart = request.bookOrPart || "";
		
		if (this._chapters.hasOwnProperty(request.bookOrPart)) {
			return this._chapters[request.bookOrPart];
		} else {
			throw "The history entry for " + this._when + " has no chapter counts for the specified book or part.";
		}
	},
	
	getParent: function(bookOrPartUID) {
		// summary: Returns the parent UID for a given book or part, if there is one, or null.
		
		if (this._parents.hasOwnProperty(request.bookOrPartUID)) {
			return this._parents[bookOrPartUID]
		}
		return null;
	},
	
	listBooksAndParts: function() {
		var result = this._booksAndParts.slice(0);
		result.splice(result.indexOf(""),1);
		return result;
	},
	
	listStatuses: function(bookOrPart) {
		var result = this._statuses[bookOrPart || ""];
		if (result) {
			result.splice(result.indexOf(""), 1);
			return result;
		}
		return [];
	},
	
	updateFromContent: function(projectData) {
		// this is just a sanity check.
		if (!dojo.date.compare(this._when, new Date(), "date") === 0) {
			throw "Only the current entry can be updated."
		}
		var result = new dojo.Deferred();
		try {
			this._resetData();
			
			var current = {
				uid: ""
			}
			this._booksAndParts.push("");
			this._statuses[""] = []; 
			
			var groupStart = dojo.hitch(this,function(item) {
				var uid = projectData.ProjectStore.getValue(item, "uid"); 
				var parent = current.uid || null;
				current = {
					uid: uid,
					parent: current
				}
				if (parent) {
					this._parents[uid] = parent;
				}
				this._booksAndParts.push(uid);
				this._statuses[uid] = [];
			});
			
			var groupComplete = function() {
				current = current.parent;
			}
			
			projectData.IterateContent({
				onBook: groupStart,
				onBookComplete: groupComplete,
				onPart: groupStart,
				onPartComplete: groupComplete,
				onChapter: dojo.hitch(this, function(item) {
					this._loadIncChapters(current.uid || "", this._parents[current.uid] || "", 1);
				}),
				onScene: dojo.hitch(this, function(item) {
					var status = projectData.ProjectStore.getValue(item, "status", "") || "";
					var words = projectData.ProjectStore.getValue(item, "lastWordCount", 0) || 0;
					if (dojo.indexOf(this._statuses, status || "") == -1) {
						this._statuses[current.uid || ""].push(status || "");
					}
					this._loadIncCounts(current.uid || "", this._parents[current.uid] || "", status || "", "_scenes", 1);
					this._loadIncCounts(current.uid || "", this._parents[current.uid] || "", status || "", "_words", words || 0);
				}),
				onComplete: dojo.hitch(this, function(item) {
					this.updated(this);
					result.callback();
				})
			})
		// call this to notify others that the entry has been updated.
		} catch (ex) {
			result.errback(ex);
		}
		return result;
	},
	
	updated: function(entry) {
		// This is a stub function to be called when everything is updated from content,
		// representing a complete recreation of all contained data.
	}
	
});