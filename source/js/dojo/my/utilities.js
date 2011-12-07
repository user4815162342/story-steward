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
dojo.provide("my.utilities");
dojo.declare("my.ProjectData", null, {});

my.utilities.search = function(arr, value, args) {
	// Basically a binary search, but returns the index at which
	// the item should be inserted if it isn't there.
	// Oh, Dear Supreme Computer, I hope I've done this correctly...
	if (!args) {
		args = {
			comparator: function(a,b) {
				return a - b;
			}
		}
	}
	
	var bottom = -1;
	var top = arr.length;
	var middle;
	var comparison;
	
	while ((top - bottom) > 1) {
		middle = (bottom + top) >> 1;
		comparison = args.comparator(arr[middle], value);
		if (comparison < 0) {
			bottom = middle;
		} else if (comparison > 0) {
			top = middle;
		} else {
			return middle;
		}
	}
	return args.returnInsertIndex ? top : (args.returnPriorIndex ? bottom : -1);
	
}
