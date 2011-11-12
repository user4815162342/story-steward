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
dojo.provide("my.extensions");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.Editor");
/****** Component Enhancements ***********/

/** ItemFileReadStore: Allow Drill-Down Queries:
 This extends the ItemFileReadStore to allow extra query
 options, which will allow you to limit your search to just
 the children of a specific data item. The data item must
 be an item within the store. The query can not be 'deep',
 as the expected outcome for this is unclear (i.e. are
 cyclical references to items kept outside of the hierarchy
 included? What attributes to search on child items?),
 and processing time is more expensive (would have to walk the
 entire tree below the parent) so if both are specified, then
 an error will be thrown.
 New Query Options:
 - parentItem: a parent data item from which to retrieve
 the items to filter.
 - parentAttribute: attribute on the parent data item in which
 to find children. If the attribute contains values which are
 not data items, they will not be returned.**/
dojo.extend(dojo.data.ItemFileReadStore, {
    _getItemsArray: function(/*object?*/queryOptions) {
        if (queryOptions) {
            if (queryOptions.deep && queryOptions.parentItem) {
                throw "Invalid query: a drill-down search can not be 'deep'"
            }
            if (queryOptions.deep) {
                return this._arrayOfAllItems;
            }
            if (queryOptions.parentItem) {
                if (!queryOptions.parentAttribute) {
                    throw "Invalid query: an attribute is required for drill-down searches.";
                }
                return this.getValues(queryOptions.parentItem, queryOptions.parentAttribute);
            }
        }
        return this._arrayOfTopLevelItems;
    },
    
    /** ItemFileReadStore: Check Filter Match:
     * Extends ItemFileReadStore to check if an item has matched the query.
     * NOTE: This one recreates code from ItemFileReadStore, instead of re-using,
     * because much of that code is embedded in a closure inside _fetchItems.
     * This is unfortunate, but necessary.
     */
    matchesQuery: function(item, request) {
        // check the array of items first:
        if (dojo.indexOf(this._getItemsArray(request.queryOptions), item) == -1) {
            return false;
        }
        if (request.query) {
            var value, ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
            
            //See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
            //same value for each item examined.  Much more efficient.
            var regexpList = {};
            for (key in request.query) {
                value = request.query[key];
                if (typeof value === "string") {
                    regexpList[key] = dojo.data.util.filter.patternToRegExp(value, ignoreCase);
                } else if (value instanceof RegExp) {
                    regexpList[key] = value;
                }
            }
            var match = true;
            for (key in request.query) {
                value = request.query[key];
                if (!this._containsValue(items, key, value, regexpList[key])) {
                    match = false;
                }
            }
            return match;
        }
        return true;
        
        
    }
    
});

/** dijit.Editor: bug http://bugs.dojotoolkit.org/ticket/8052
 * The bug is supposedly fixed with another bug fix, but I'm still
 * seeing the problem. This is a workaround for this bug.
 * Basically, all this does is re-do destroy to check if toolbar
 * is defined before destroying it.
 * TODO: Need to report that the bug is still there.
 */
dojo.extend(dijit.Editor, {
    destroy: function() {
        dojo.forEach(this._plugins, function(p) {
            if (p && p.destroy) {
                p.destroy();
            }
        });
        this._plugins = [];
        if (this.toolbar) {
            this.toolbar.destroyRecursive();
            delete this.toolbar;
        }
        this.inherited("destroy",arguments);
    }
    
});

