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
dojo.provide("my.DataGrid");
dojo.require("dojox.grid.EnhancedGrid");
dojo.require("my.extensions")
/**
 * my.DataGrid: Avoid adding new records which don't match.
 * This will prevent new records which don't match the query from
 * being shown on screen. Requires the datastore to support the
 * matchesQuery function defined above. If it doesn't the record
 * will always be shown on screen.
 */
dojo.declare("my.DataGrid", [dojox.grid.EnhancedGrid], {
    _onNew: function(item, parentInfo) {
		try {
			var matches = true;
			if (this.store.matchesQuery) {
				matches = this.store.matchesQuery(item, {
					query: this.query,
					queryOptions: this.queryOptions
				});
			}
			if (matches) {
				this.inherited(arguments);
			}
		} catch (e) {
			alert(e);
		}
    },
	
	_onSet: function() {
		this.inherited(arguments);
	}
});

my.DataGrid.markupFactory = function(props, node, ctor, cellFunc) {
    return dojox.grid._Grid.markupFactory(props, node, ctor, dojo.partial(dojox.grid.DataGrid.cell_markupFactory, cellFunc));
};
