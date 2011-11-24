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
dojo.provide("my.schemas.ProjectDataValidator");
dojo.require("dojo.cache");
dojo.require("dojox.json.ref");
//dojo.require("dojox.json.schema");
// NOTE: Since the dojox schema isn't up to the latest revisions of the spec, 
// I'm using a third-party code, ironically written by the same guy who
// wrote the one in dojo, (also the guy who wrote the specs), except that
// he's kept it updated. The library is stored in JSON.schema.

/*
 * TODO: Need to come up with a 1.1 format. This format would make the following modifications:
 * TODO: Once that is done, rewrite the saving and validating code to make use of the
 * schema to determine how things should be saved. This means the schema has to
 * be publicly visible after all.
 * TODO: Once a new format version is found, need to figure out the best way to
 * convert things. I'd prefer that this is done without alerts. Probably, a
 * transformer object would be used to transform a schema into the current version,
 * based on the version found.
 */ 

(function() {

	var me = dojo.declare("my.schemas.ProjectDataValidator", [], {});
	
	/* NOTE: For Adding New Format Versions:
	 * Assuming the validation process will always be done similarly, I've marked
	 * in comments here and there with details on what needs to be added. Each one
	 * is marked with 'NEWFORMAT:'. If the format differs drastically, then more
	 * complete rewriting is necessary.
	 */
	var formatMarkerPattern = /^(.*)-(\d*)\.(\d*)$/;
	
	
	// NOTE: This slows things down. It should only be used
	// when trying out changes to a schema.
	function lookForProblems(data) {
		var visited = "______visited";
		var cache = [];
		function cleanup() {
			while (cache.length > 0) {
				delete (cache.pop())[visited];
			}
			
		}
		var classes = [];
		
		function lookForUnresolvedReferences(node) {
			if (typeof node == "object") {
				if (node["$ref"]) {
					throw "Unresolved reference to " + node["$ref"];
				}
				if (node.id) {
					classes.push(node);
				}
				if (typeof node[visited] == "undefined") {
					cache.push(node);
					node[visited] = true;
					for (var prop in node) {
						if (node.hasOwnProperty(prop) && (prop != visited) && !(prop.charAt(0) == '_' && prop.charAt(1) == '_')) {
							lookForUnresolvedReferences(node[prop]);
						}
					}
				}
			}
		};
		
		try {
			lookForUnresolvedReferences(data)
		} finally {
			cleanup();
		}
		
		function lookForCircularDependencies() {
		
			// there's probably a better way to do this...
			
			function scanDependencies(node) {
				if (typeof node[visited] == "undefined") {
					cache.push(node);
					node[visited] = 1;
				} else if (node[visited] === 1) {
					throw "Possible circular dependency on node id " + node.id;
				}
				if (typeof node["extends"] != "undefined") {
					if (dojo.isArray(node["extends"])) {
						for (var i = 0; i < node["extends"].length; i++) {
							scanDependencies(node["extends"][i]);
						}
					} else {
						scanDependencies(node["extends"]);
					}
				}
				node[visited] = 0;
				
			}
			
			for (var i = 0; i < classes.length; i++) {
				scanDependencies(classes[i]);
			}
			
			
		};
	
		try {
			lookForCircularDependencies(data)
		} finally {
			cleanup();
		}
		
        var schemaValidate = JSON.schema.validate(this.schema,dojox.json.ref.fromJson('{"$schema":"http://json-schema.org/draft-03/schema#","id":"http://json-schema.org/draft-03/schema#","type":"object","properties":{"type":{"type":["string","array"],"items":{"type":["string",{"$ref":"#"}]},"uniqueItems":true,"default":"any"},"properties":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"patternProperties":{"type":"object","additionalProperties":{"$ref":"#"},"default":{}},"additionalProperties":{"type":[{"$ref":"#"},"boolean"],"default":{}},"items":{"type":[{"$ref":"#"},"array"],"items":{"$ref":"#"},"default":{}},"additionalItems":{"type":[{"$ref":"#"},"boolean"],"default":{}},"required":{"type":"boolean","default":false},"dependencies":{"type":"object","additionalProperties":{"type":["string","array",{"$ref":"#"}],"items":{"type":"string"}},"default":{}},"minimum":{"type":"number"},"maximum":{"type":"number"},"exclusiveMinimum":{"type":"boolean","default":false},"exclusiveMaximum":{"type":"boolean","default":false},"minItems":{"type":"integer","minimum":0,"default":0},"maxItems":{"type":"integer","minimum":0},"uniqueItems":{"type":"boolean","default":false},"pattern":{"type":"string","format":"regex"},"minLength":{"type":"integer","minimum":0,"default":0},"maxLength":{"type":"integer"},"enum":{"type":"array","minItems":1,"uniqueItems":true},"default":{"type":"any"},"title":{"type":"string"},"description":{"type":"string"},"format":{"type":"string"},"divisibleBy":{"type":"number","minimum":0,"exclusiveMinimum":true,"default":1},"disallow":{"type":["string","array"],"items":{"type":["string",{"$ref":"#"}]},"uniqueItems":true},"extends":{"type":[{"$ref":"#"},"array"],"items":{"$ref":"#"},"default":{}},"id":{"type":"string","format":"uri"},"$ref":{"type":"string","format":"uri"},"$schema":{"type":"string","format":"uri"}},"dependencies":{"exclusiveMinimum":"minimum","exclusiveMaximum":"maximum"},"default":{}}'));
		if (!schemaValidate.valid) {
			var msg = "Schema is not valid\n\n" +
			"Details:\n-------\n";
			for (var i = 0; i < schemaValidate.errors.length; i++) {
				msg += schemaValidate.errors[i].property + " " + schemaValidate.errors[i].message + "\n";
			}
			throw msg;
		}
	}
	
	var storySteward10Validator = {
		version: {
			name: "story-steward",
			major: 1,
			minor: 0
		
		},
		schema: null,
		validate: function(data) {
			if (!this.schema) {
				
				try {
					this.schema = dojox.json.ref.fromJson(dojo.cache("my.schemas", "1.0/project-data.json"));
					// TODO: Comment out this next line when everything seems to be working.
					lookForProblems(this.schema);
					// NEWFORMAT: May need to make sure this is done for new schemas.
				} catch (ex) {
					this.schema = null;
					throw ex;
				}
				
			}
			return JSON.schema.validate(data, this.schema);
		},
		convertFrom: function() {
			return false;
		}
	}
	
	var storySteward11Validator = {
		version: {
			name: "story-steward",
			major: 1,
			minor: 1
		
		},
		schema: null,
		validate: function(data) {
			if (!this.schema) {
			
				try {
					this.schema = dojox.json.ref.fromJson(dojo.cache("my.schemas", "1.1/project-data.json"));
					// TODO: Comment out this next line when everything seems to be working.
					lookForProblems(this.schema);
				// NEWFORMAT: May need to make sure this is done for new schemas.
				} catch (ex) {
					this.schema = null;
					throw ex;
				}
				
			}
			return JSON.schema.validate(data, this.schema);
		},
		
		convertFrom: function(fromVersion, data) {
			if (fromVersion === me.versions["story-steward-1.0"]) {
			
				function convertTags(data) {
					if (dojo.isString(data)) {
						return [data];
					}
					return data;
					
				}
				
				function convertTimestamp(data) {
					if (dojo.isObject(data)) {
						data = data._value;
					}
					return data;
				}
				
				function convertTimestampToDate(data) {
					data = convertTimestamp(data);
					return data.substr(0, data.indexOf("T"));
				}
				
				function convertEntity(data) {
					data.created = convertTimestamp(data.created);
					data.modified = convertTimestamp(data.modified);
					if (data.tags) {
						data.tags = convertTags(data.tags);
					}
				}
				
				var history = [];
				
				var convert = {
					"credit": function(data) {
						data.type = "credit";
						convertEntity(data);
					},
					"note": function(data) {
						convertEntity(data);
						if (data.subnotes) {
							if (!dojo.isArray(data.subnotes)) {
								data.subnotes = [data.subnotes];
							}
							dojo.forEach(data.subnotes, convert.note);
						}
						
					},
					"goal": function(data) {
						debugger;
						convertEntity(data);
						if (data.targetStatus) {
							data.whatStatus = data.targetStatus;
						}
						delete data.targetStatus;
						// No need to fix what/where, since that wasn't used
						// previously.
						data.what = "words";
						data.starting = convertTimestampToDate(data.starting);
						data.ending = convertTimestampToDate(data.ending);
						data.startingCount = data.startingWordCount;
						delete data.startingWordCount;
						data.targetCount = data.targetWordCount;
						delete data.targetWordCount;
						if (!dojo.isArray(data.history)) {
							data.history = [data.history];
						}
						for (var i = 0; i < data.history.length; i++) {
							data.history[i].when = convertTimestampToDate(data.history[i].when);
							data.history[i].status = data.whatStatus || "Unknown";
							history.push(data.history[i]);
						}
						delete data.history;
						
					},
					"journal": function(data) {
						convertEntity(data);
						data.posted = convertTimestamp(data.posted);
					},
					"content": function(data) {
						convertEntity(data);
						dojo.forEach(data.credits || [], convert.credit);
						
						switch (data.subtype) {
							case "book":
							case "part":
							case "chapter":
								dojo.forEach(data.content || [], convertObject);
								break;
						}
						// new format doesn't bother with subtype
						data.type = data.subtype;
						delete data.subtype;
						
					}
				}
				
				function convertObject(data) {
					if (data.hasOwnProperty("type")) {
						if (convert.hasOwnProperty(data.type)) {
							convert[data.type](data);
						} else {
							convertEntity(data);
						}
					}
					return data;
				}
				
				convertEntity(data);
				
				data.format = this.version.name + "-" + this.version.major + "." + this.version.minor;
				
				dojo.forEach(data.credits || [], convert.credit);
				
				dojo.forEach(data.content || [], convertObject);
				if (data.notes) {
					dojo.forEach(data.notes, convertObject);
				} else {
					data.notes = [];
				}
				
				var people = data.people || [];
				var places = data.places || [];
				var things = data.things || [];
				var journal = data.journal || [];
				var goals = data.goals || [];
				delete data.people;
				delete data.places;
				delete data.things;
				delete data.journal;
				delete data.goals;
				
				data.notes.push.apply(data.notes, dojo.map(people, convertObject));
				data.notes.push.apply(data.notes, dojo.map(places, convertObject));
				data.notes.push.apply(data.notes, dojo.map(things, convertObject));
				
				data.work = [];
				data.work.push.apply(data.work, dojo.map(journal, convertObject));
				data.work.push.apply(data.work, dojo.map(goals, convertObject));
				
				history.sort(function(a, b) {
					return a.when < b.when ? -1 : (a.when > b.when ? 1 : 0);
				})
				
				data.history = []
				
				if (history.length > 0) {
					function convertHistory(data) {
						return {
							uid: data.uid,
							when: data.when,
							byBookOrPart: [{
								chapters: 0,
								byStatus: [{
									status: data.status,
									scenes: 0,
									words: data.wordCount
								}]
							}]
						}
						
					}
					
					var last = convertHistory(history[0]);
					data.history.push(last);
					for (var i = 1; i < history.length; i++) {
						if (history[i].when == last.when) {
							var statuses = last.byBookOrPart[0].byStatus;
							var found = false;
							var subtract = (history[i].status == "Unknown");
							for (var j = 0; j < statuses.length; j++) {
								if (subtract) {
									history[i].wordCount -= statuses[j].words;
								}
								if (!found && (statuses[j].status == history[i].status)) {
									found = true;
								}
							}
							if (!found) {
								statuses.push({
									status: history[i].status,
									scenes: 0,
									words: history[i].wordCount
								})
							}
						} else {
							last = convertHistory(history[i]);
							data.history.push(last);
						}
					}
				}
				
				var validate = this.validate(data);
				if (!validate.valid) {
					var msg = "Project file could not be converted\n\n" +
					"Details:\n-------\n";
					for (var i = 0; i < validate.errors.length; i++) {
						msg += validate.errors[i].property + " " + validate.errors[i].message + "\n";
					}
					throw msg;
				}
				
			}
			return true;
		}
	}

	// NEWFORMAT: Create a new format validator like above.
	
	dojo.mixin(my.schemas.ProjectDataValidator, {
	
		versions: {
			"story-steward-1.0": storySteward10Validator.version,
			"story-steward-1.1": storySteward11Validator.version
			// NEWFORMAT: Add a new version member here. 
			// If the new format replaces the current version,
			// make sure the string is specified above.
		},
		
		findFormatVersion: function(/*Object*/data) {
			// summary:
			//   Attempts to find a story steward format marker in the passed
			//   object, and parse out a version to return. 
			// description: 
			//   Attempts to find a story steward format marker in the passed
			//   object, and parse out a version to return. As long as the
			//   marker is found, and as long as that marker fits a known
			//   pattern, a version will be returned, even if that version
			//   is currently unknown. If the marker can be found, but doesn't
			//   match the pattern, then the value of that marker will
			//   be returned. If no marker is found, then null will be returned.
			//     
			//   If the version is known, the function will return one of the 
			//   constant version objects, so that equality will work.
			// returns:
			//   An version object, the string value of an unknown marker, or
			//   null if no version marker was found. 
			if (typeof data.format !== "undefined") {
				var matches = formatMarkerPattern.exec(data.format);
				if (matches) {
					if (me.versions.hasOwnProperty(data.format)) {
						return me.versions[data.format]; // Object
					}
					// create a version for future version strings.
					return { // Object
						name: matches[1],
						major: parseInt(matches[2]),
						minor: parseInt(matches[3])
					}
				}
				return data.format; // String
			}
			return null; // null
		},
		
		getVersionInfoString: function(/*Object|String*/formatVersion) {
			if (dojo.isString(formatVersion)) {
				return formatVersion;
			}
			return "Name: " + formatVersion.name +
			" Version: " +
			formatVersion.major +
			"." +
			formatVersion.minor
		},
		
		validate: function(/*Object*/data, /*Object?*/ formatVersion) {
			// summary:
			//   Validates the document according to the specified format version.
			// description:
			//   Validates the passed document according to the specified format
			//   version. If the format version is not specified, will attempt to
			//   find the version in the document object and use that.
			//
			//   The passed format version is checked against known format versions
			//   as specified in the constants, using object equality. Passing
			//   a different object that otherwise matches a known version in all
			//   fields, will fail. 
			//
			// returns:
			//   An object indicating the validity of the document. The object will
			//   contain a boolean property 'valid', indicating whether the document
			//   is valid. If valid is true, will include a 'format' property which
			//   indicates the format version which was validated to.
			//   If valid is false, then it will also contain a property
			//   called 'errors', which will be an array which lists the errors found
			//   during validation. Each error will consist of a 'property' and a
			//   'message' value.
			if (typeof formatVersion == "undefined") {
				// we have to figure out what version to use.
				formatVersion = me.findFormatVersion(data);
				if (!formatVersion) {
					return { // Object
						valid: false,
						errors: [{
							property: "Project file",
							message: "is not formatted correctly."
						}]
					}
				}
			}
			var result;
			// NEWFORMAT: Add to this conditional, the more current ones at the top.
			if (formatVersion === me.versions["story-steward-1.1"]) {
				result = storySteward11Validator.validate(data); // Object
			} else if (formatVersion === me.versions["story-steward-1.0"]) {
				result = storySteward10Validator.validate(data); // Object
			} else {
				result = { // Object
					valid: false,
					errors: [{
						property: "File format " + me.getVersionInfoString(formatVersion),
						message: "is unknown."
					}]
				}
			}
			result.format = formatVersion;
			return result;
		},
		
		convert: function(/*Object*/fromVersion, /*ObjectVersion*/toVersion, /*Object*/data) {
			// summary:
			//   Converts the data from one schema to another. Returns false if the conversion
			//   can not be done.
			// NEWFORMAT: Add to this conditional, the more current ones at the top.
			if (toVersion === me.versions["story-steward-1.1"]) {
				return storySteward11Validator.convertFrom(fromVersion, data); // boolean
			} else if (toVersion === me.versions["story-steward-1.0"]) {
				return storySteward10Validator.convertFrom(fromVersion, data); // boolean
			} else {
				return false;
			}
			
		}
	
	})
	
	
})();