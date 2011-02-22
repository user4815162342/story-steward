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
dojo.provide("my.GoalProgress");
// TODO: Have to find a way to require these from the template instead
// of this file, so I can use widgets which I don't know about.
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.ProgressBar");

dojo.require("my.DataItemViewer");
dojo.require("my.GoalHistoryChart");

dojo.declare("my.GoalProgress", [dijit.layout.ContentPane, dijit._Templated], {

    constructor: function(args) {
        this.templatePath = dojo.moduleUrl("my", "GoalProgress.html");
        
    },
    
    
    widgetsInTemplate: true,
    
    postCreate: function() {
        this.inherited(arguments);
    },
    
    _dataItemSetValues: function(newValues, attribute) {
    
        // only update if fields we are interested are changed.
        switch (attribute) {
            case "starting":
            case "created":
            case "ending":
            case "history":
            case "targetWordCount":
            case "startingWordCount":
                break;
            default:
                {
                    // I don't have to do anything here...
                    return;
                }
        }
        
        newValues = dojo.isArray(newValues) ? newValues : [newValues];
        
        this._historyItems = newValues;
        
        
        
        // look for a 'starting' date. If one isn't set, the goal starts
        // when it was created.
        var starting = this.bindStore.getValue(this.bindItem, "starting", null);
        if (!starting) {
            starting = this.bindStore.getValue(this.bindItem, "created", null);
            if (!starting) {
                // really shouldn't happen, as there should be a 'created' date on the goal.
                starting = newValues.length ? this.bindStore.getValue(newValues[0], "when", new Date()) : new Date();
            }
        }
        
        // The following will create a sparse array of word counts numbered based on
        // the day in the goal's period. This means we don't have to sort them
        // by date, later.        
        var history = [];
        for (var i = 0; i < newValues.length; i++) {
            // NOTE: The 'null' default raises an error here
            var when = this.bindStore.getValue(newValues[i], "when", null);
            if (when && (when instanceof Date)) {
                var index = dojo.date.difference(starting, when, "day");
                history[index] = this.bindStore.getValue(newValues[i], "wordCount", 0);
            }
        }
        
        var currentDay = dojo.date.difference(starting, null, "day");
        
        // look for an 'ending' date. If one isn't set, the goal 'ends' on the
        // last day of the history, or the starting date if there is no history.
        var ending = this.bindStore.getValue(this.bindItem, "ending", null);
        if (!ending) {
            ending = history.length ? history[history.length - 1].when : starting;
        }
        
        // We need the 'target' to calculate the 'suggested' values.		
        var targetWords = this.bindStore.getValue(this.bindItem, "targetWordCount", 0);
        
        var startWords = this.bindStore.getValue(this.bindItem, "startingWordCount", 0);
        
        // figure out the real history, for charting:
        var dayCount = dojo.date.difference(starting, ending, "day") + 1; // add one for the first day as well.
        var last = {
            actual: startWords,
            suggested: startWords,
            when: starting
        }
        var today = last;
        var yesterday = last;
        var remainingDays = dayCount;
        var moreRequired = true;
        var requiredDailyCount = 0;
        for (var i = 0; i < dayCount; i++) {
            history[i] = {
                actual: history[i] || last.actual,
                when: dojo.date.add(last.when, "day", 1),
                suggested: Math.round(last.suggested + ((targetWords - last.suggested) / remainingDays))
            };
            moreRequired = moreRequired && (history[i].actual < targetWords);
            if (i > currentDay) {
                history[i].actual = null;
                history[i].required = moreRequired && Math.round((last.required || last.actual) + (Math.max(targetWords - (last.required || last.actual), 0) / remainingDays));
                if (!requiredDailyCount && history[i].required) {
                    requiredDailyCount = Math.round((Math.max(targetWords - (last.required || last.actual), 0) / remainingDays));
                }
            } else {
                yesterday = today;
                today = history[i];
                if ((i == currentDay) && (history[i].actual < history[i].suggested)) {
                    history[i].required = moreRequired && Math.round(history[i].actual + (Math.max(targetWords - history[i].actual, 0) / remainingDays));
                    if (!requiredDailyCount && history[i].required) {
                        requiredDailyCount = Math.round(Math.max(targetWords - history[i].actual, 0) / remainingDays);
                    }
                } else {
                    history[i].required = null;
                }
                
            }
            
            last = history[i];
            remainingDays--;
            
        }
        
        var averageDailyCount = currentDay ? ((today.actual - startWords) / currentDay) : 0;
        var daysToFinish = averageDailyCount ? (Math.ceil((targetWords - today.actual) / averageDailyCount)) : Number.POSITIVE_INFINITY;
        
        this._chart.UpdateChart({
            startWords: startWords,
            targetWords: targetWords,
            currentWords: today.actual,
            dayCount: dayCount,
            currentDay: currentDay,
            history: history
        });
        
        this._goalProgress.update({
            maximum: targetWords,
            progress: today.actual
        });
        this._suggestedProgress.update({
            maximum: today.suggested - yesterday.actual,
            progress: today.actual - yesterday.actual
        });
        this._requiredProgress.update({
            maximum: today.required - yesterday.actual,
            progress: today.actual - yesterday.actual
        });
        if ((currentDay < dayCount) || (currentWords > targetWords)) {
            dojo.style(this._scold, "display", "none");
        }
        remainingDays = dayCount - currentDay;
        if (remainingDays < 0) {
            this._statistics.set('content', "");
        } else {
            this._daysRemaining.innerHTML = remainingDays;
            this._wordsToday.innerHTML = today.actual - yesterday.actual;
            this._suggestedDailyCount.innerHTML = Math.round((targetWords - startWords) / dayCount);
            this._averageDailyCount.innerHTML = averageDailyCount;
            this._requiredDailyCount.innerHTML = requiredDailyCount;
            this._expectedFinishDate.innerHTML = (daysToFinish == Number.POSITIVE_INFINITY) ? "Never" : dojo.date.locale.format(dojo.date.add(today.when, "day", daysToFinish), {
                selector: 'date',
                fullYear: true
            });
        }
        
    },
    
    _dataItemBind: function(dataStore, dataItem, bindScope, viewer) {
        this.inherited(arguments);
        var dataStoreOnSet;
        if (dataStore.getFeatures()['dojo.data.api.Notification'] == true) {
            // need to simulate the attribute value changing when the history data changes.
            this.connect(dataStore, "onSet", function(item, attribute, oldValue, newValue) {
                if (this._historyItems && (dojo.indexOf(this._historyItems, item) > -1)) {
                    this._dataItemSetValues(this._historyItems, "history");
                }
            });
        }
        
    },
    
    _dataItemSet: function(newValue) {
        throw "Use dataItemSetValues. Should never get here."
    },
    
    _dataItemGet: function() {
        // This is a read-only item, as should be obvious
        // that there's no 'onChange'.
    },
    
    _dataItemEditing: function() {
        return false;
    },
    
    _dataItemSetDisabled: function() {
        // This is a read-only item, so it shouldn't be enabled in the first place.
    },
    
    _dataItemSave: function() {
    },
    
    _dataItemCancel: function() {
    }
    
});


