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
 * - fix the numerous problems which came as a result of not checking against a schema
 * before (such as date times which still keep internal errors, and arrays put out as
 * scalar because there was only one item).
 * - make 'credits' descend from 'entity', to simplify the schema somewhat.
 * - extract 'history' from goals, and make it part of the project. It would be nice 
 * if we'd automatically extract these from the goals for older versions.
 * - possibly, make all 'root' level entities all in one array, rather than separate
 * ones for separate types.
 * TODO: Once that is done, rewrite the saving and validating code to make use of the
 * schema to determine how things should be saved. This means the schema has to
 * be publicly visible after all.
 * TODO: Once a new format version is found, need to figure out the best way to
 * convert things. I'd prefer that this is done without alerts. Probably, a
 * transformer object would be used to transform a schema into the current version,
 * based on the version found.
 */ 

(function() {

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
					// lookForProblems(this.schema);
					// NEWFORMAT: May need to make sure this is done for new schemas.
				} catch (ex) {
					this.schema = null;
					throw ex;
				}
				
			}
			return JSON.schema.validate(data, this.schema);
		}
	}
	
	// NEWFORMAT: Create a new format validator like above.
	
	var me = dojo.declare("my.schemas.ProjectDataValidator", [], {});
	
	dojo.mixin(my.schemas.ProjectDataValidator, {
	
		versions: {
			current: storySteward10Validator.version,
			storySteward10: storySteward10Validator.version
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
					// NEWFORMAT: Must add to the conditional to return the version
					// for the correct item.
					if ((matches[1] === "story-steward") &&
					(matches[2] == "1") &&
					(matches[3] == "0")) {
						return me.versions.storySteward10; // Object
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
			formatVersion.minor +
			((typeof formatVersion.revision == "undefined") ? ("." + formatVersion.revision) : "");
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
			// NEWFORMAT: Add to this conditional
			var result;
			if (formatVersion === me.versions.storySteward10) {
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
	
	})
	
	
})();