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
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.ProgressBar");
		dojo.require("dojox.charting.Chart2D");
		dojo.require("dojox.charting.action2d.Tooltip");
		dojo.require("dojox.charting.themes.Distinctive");

dojo.require("my.DataItemViewer");

(function() {
	var styleContent = dojo.cache("my", "GoalProgress.css");
	var head = dojo.query("head")[0];
	var style = dojo.doc.createElement("style");
	style.type = "text/css";
	var rules = dojo.doc.createTextNode(styleContent);
	style.appendChild(rules);
	head.appendChild(style);
	
})();

dojo.declare("my.GoalProgress", [dijit.layout.ContentPane, dijit._Templated], {

    constructor: function(args) {
        this.templatePath = dojo.moduleUrl("my", "GoalProgress.html");
        
    },
    
    
    widgetsInTemplate: true,
    
	_buildChart: function() {
// theme="dojox.charting.themes.Distinctive"		
		this._chartGui = new dojox.charting.Chart2D(this._chart);
		this._chartGui.addPlot("default", {
			type: "Default",
			lines: true,
			areas: false,
		    markers: true
		});
		this._chartGui.addPlot("projected", {
			type: "Default",
			lines: true,
			areas: false,
			markers: true
		});
		this._chartGui.addPlot("goal", {
			type: "Default",
			lines: true,
			areas: false,
			markers: false
		});
		this._chartGui.addPlot("grid", {
			type: "Grid",
			hMajorLines: true,
			hMinorLines: false,
			vMajorLines: false,
			vMinorLines: false
		});
		this._chartGui.addAxis("y", {
			vertical: true,
			name: "wordCount",
			title: "Word Count",
			includeZero: true,
			fixUpper: "major",
			fixLower: "major"
		});
		this._chartGui.addAxis("x", {
			name: "days",
			title: "Days"
		});
		this._chartGui.setTheme(dojox.charting.themes.Distinctive);
		
		new dojox.charting.action2d.Tooltip(this._chartGui, "default", {});
		
		new dojox.charting.action2d.Tooltip(this._chartGui, "projected", {});
		
	},
	
    postCreate: function() {
		this.inherited(arguments);
		dojo.addClass(this.domNode, ["my-goalprogress", "goal-started", "goal-not-started", "goal-ended"])
		this._buildChart();
	},
	
	setHistoryData: function(data) {
	
	
		var statistics = {
			notice: null,
			writtenToday: null,
			todayProgress: null,
			suggestedDailyGoal: null,
			dailyAverage: null,
			targetCount: data.targetCount,
			totalWritten: null,
			totalProgress: null,
			daysRemaining: null,
			timePassed: null,
			projectedFinishDate: null
		}
		
		var today = new Date();
		today.setHours(0, 0, 0, 0);
		var dayCount = dojo.date.difference(data.starting, data.ending, "day") + 1; // Need to add 1 to include that last day.
		this._chartGui.addSeries("Goal", [{
			x: 1,
			y: data.targetCount
		}, {
			x: dayCount,
			y: data.targetCount
		}], {
			plot: "goal"
		});
		
		var dayNumber = 1;
		var lastCount = data.startingCount;
		var todayNumber = dojo.date.difference(data.starting, today, "day") + 1;
		statistics.daysRemaining = dayCount - todayNumber;
		statistics.timePassed = todayNumber / dayCount;
		var todayIndex = -1;
		this._chartGui.addSeries("Actual", dojo.map(data.entries, function(item, index) {
			dayNumber = dojo.date.difference(data.starting, item.when, "day") + 1;
			if (dayNumber == todayNumber) {
				todayIndex = index;
			}
			previousCount = lastCount;
			lastCount = item.count;
			return {
				x: dayNumber,
				y: lastCount,
				tooltip: dojo.date.locale.format(item.when, {
					datePattern: "MMM d",
					selector: "date"
				}) +
				": " +
				lastCount +
				" " +
				data.what
			}
		}));
		
		statistics.totalWritten = lastCount;
		if ((statistics.daysRemaining < 0) && (statistics.totalWritten < statistics.targetCount)) {
			statistics.notice = "You Did Not Meet Your Goal!";
		} else if (statistics.totalWritten <= statistics.targetCount) {
			statistics.notice = "You Met Your Goal!";
		}
		
		statistics.totalProgress = (statistics.totalWritten / statistics.targetCount);
		statistics.dailyAverage = (lastCount - data.startingCount) / dayNumber;
		statistics.projectedFinishDate = dojo.date.add(today, "day", Math.ceil((statistics.targetCount - statistics.totalWritten) / statistics.dailyAverage));
		
		var writtenYesterday = data.startingCount;
		if (todayIndex > 0) {
			writtenYesterday = data.entries[todayIndex - 1].count;
			statistics.writtenToday = data.entries[todayIndex].count - writtenYesterday;
		} else if (todayIndex == 0) {
			statistics.writtenToday = data.entries[0].count - data.startingCount;
		} else {
			statistics.writtenToday = 0;
		}
		statistics.suggestedDailyGoal = (data.targetCount - writtenYesterday) / (statistics.daysRemaining + 1);
		statistics.todayProgress = statistics.writtenToday / statistics.suggestedDailyGoal;
		
		if (dojo.date.compare(today, data.ending) < 0) {
			var projectedCount = Math.floor(lastCount + (statistics.dailyAverage * (dayCount - dayNumber)));
			this._chartGui.addSeries("Projected", [{
				x: dayNumber,
				y: lastCount
			}, {
				x: dayCount,
				y: projectedCount,
				tooltip: "At your current rate you will have " + projectedCount + " " + data.what + " on day " +
				dojo.date.locale.format(data.ending, {
					datePattern: "MMM d",
					selector: "date"
				})
			}], {
				plot: "projected",
				stroke: {
					style: "ShortDash"
				}
			})
		}
		
		var dayLabels = [];
		for (var day = data.starting; dojo.date.compare(day, data.ending) <= 0; day = dojo.date.add(day, "day", 1)) {
			dayLabels.push({
				value: dayLabels.length + 1,
				text: dojo.date.locale.format(day, {
					datePattern: "MMM d",
					selector: "date"
				})
			})
		}
		
		this._chartGui.addAxis("x", {
			name: "days",
			title: "Days",
			labels: dayLabels
		});
		this._chartGui.render();
		
		if (statistics.daysRemaining < 0) {
			dojo.removeClass(this.domNode, "goal-not-started");
			dojo.removeClass(this.domNode, "goal-started");
			dojo.addClass(this.domNode, "goal-ended");
		} else if (todayNumber < 0) {
			dojo.removeClass(this.domNode, "goal-started");
			dojo.removeClass(this.domNode, "goal-ended");
			dojo.addClass(this.domNode, "goal-not-started");
		} else {
			dojo.removeClass(this.domNode, "goal-ended");
			dojo.removeClass(this.domNode, "goal-not-started");
			dojo.addClass(this.domNode, "goal-started");
		}
		
		if (statistics.notice) {
			dojo.removeClass(this._notice, "hide-on-no-notice");
			this._notice.innerHTML = statistics.notice;
		} else {
			dojo.addClass(this._notice, "hide-on-no-notice");
		}
		if (statistics.daysRemaining >= 0) {
			this._writtenToday.innerHTML = statistics.writtenToday;
			this._todayProgress.update({
				minimum: 0,
				maximum: 100,
				progress: Math.max(0, Math.ceil(statistics.todayProgress * 100))
			})
			this._suggestedDailyGoal.innerHTML = Math.ceil(statistics.suggestedDailyGoal);
			this._projectedFinishDate.innerHTML = !isNaN(statistics.projectedFinishDate.getTime()) ? dojo.date.locale.format(statistics.projectedFinishDate, {
				selector: "date",
				formatLength: "medium"
			}) : "Never";
		}
		this._dailyAverage.innerHTML = Math.floor(statistics.dailyAverage);
		this._targetCount.innerHTML = statistics.targetCount;
		this._totalWritten.innerHTML = statistics.totalWritten;
		this._totalProgress.update({
			minimum: 0,
			maximum: 100,
			progress: Math.max(0, Math.ceil(statistics.totalProgress * 100))
		});
		this._daysRemaining.innerHTML = Math.max(0, statistics.daysRemaining);
		this._timePassed.update({
			minimum: 0,
			maximum: 100,
			progress: Math.max(0, Math.ceil(statistics.timePassed * 100))
		});
		
		
	}
	
    
});


