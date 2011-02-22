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
dojo.provide("my.GoalHistoryChart");
// TODO: Have to find a way to require these from the template instead
// of this file, so I can use widgets which I don't know about.
dojo.require("dojox.charting.widget.Chart2D");
dojo.require("dojox.charting.themes.Distinctive");

dojo.declare("my.GoalHistoryChart", [dojox.charting.widget.Chart2D], {

    postCreate: function() {
        this.chart.addSeries("Actual", [], {});
        this.chart.addSeries("Suggested", [], {});
        this.chart.addSeries("Required", [], {});
        this.chart.render();
    },
    
    resize: function(box) {
        // This overrides an error which is called,
        // because layoutWidget calls resize without a parameter.
        // I suspect this is a recent change that simply has not
        // been propagated to the chart.
        // TODO: Report this bug to dojo.
        if (box) {
            this.inherited(arguments);
        } else {
        
        }
    },
    
    UpdateChart: function(args) {
    
        // Now, build the series.
        var suggested = dojo.map(args.history, function(item) {
            return {
                y: item.suggested,
                tooltip: "Suggested Pace: " + item.suggested
            }
        });
        var actual = dojo.map(args.history, function(item) {
            return {
				// setting the minimum at startWords makes sure that
				// the chart only shows down to that minimum.
                y: item.actual || args.startWords,
                tooltip: item.actual ? ("Actual: " + item.actual) : ""
            }
        });
        var required = dojo.map(args.history, function(item) {
            return {
				// setting the minimum at startWords makes sure that
				// the chart only shows down to that minimum.
                y: item.required || args.startWords,
                tooltip: item.required ? ("Required Pace: " + item.required) : ""
            }
            
        });
        
        
        this.chart.updateSeries("Actual", actual, {});
        this.chart.updateSeries("Suggested", suggested, {});
        this.chart.updateSeries("Required", required, {});
        this.chart.render();
    },


});
