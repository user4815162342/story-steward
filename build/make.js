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
var scriptArguments = arguments;
var global = this;

if (scriptArguments.length == 0) {
    throw "Please call this script using the the appropriate shell script for your platform."
}

var params = {};
params.scriptPath = scriptArguments[0];
if (params.scriptPath.indexOf("/") == -1) {
    params.scriptPath = params.scriptPath.replace(/\\/g, "/");
}
params.buildScriptsPath = "../vendor/dojo/util/buildscripts/";

// This thing overrides the global print function to print to the log file,
// so I don't have to change any included scripts to do this. This is basically
// the closest thing to changing stdout in rhino.
var printer = (function() {
    var oldPrint = global.print;
    var outFile = new java.io.File(params.scriptPath + "build.log");
    var outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile));
    var bufferedWriter = new java.io.BufferedWriter(outWriter);
	
	global.print = function() {
		oldPrint.apply(null, arguments);
		bufferedWriter.write(Array.join(arguments," "));
		bufferedWriter.newLine();
		bufferedWriter.flush();
	}
    
    return {
        println: function(text) {
			global.print(text);
        },
		printToStandardOut: function() {
			oldPrint.apply(null,arguments);
		},
        close: function() {
            bufferedWriter.close();
        }
    }
})();
try {

    function showUsage() {
        printer.printToStandardOut("\
Usage: make [action] [target]\n\
  action: a plus-separated list of actions to perform.\n\
  target: a plus-separated list of targets to build for.\n\
Available Actions: (default is 'application' if target is specified instead)\n\
  dojo:\n\
     cleans dojo custom build and recreates it.\n\
  shrink:\n\
     removes unnecessary files from the release or debug target. This action is only\n\
	 valid for the release or debug target. The development target is never shrunk, to\n\
	 make development easier.\n\
  touch:\n\
     makes sure the target dojo build has the same file timestamps as the\n\
     source, to help in synchronization. This action is only valid for the release\n\
	 or debug target.\n\
  clean:\n\
     cleans out application code for the target. Does not touch dojo.\n\
  application:\n\
     copies application code to the target. Does nothing with dojo.\n\
  deploy:\n\
     creates package from current code for target and places in deploy.\n\
  allDojo:\n\
     shortcut for dojo,shrink,touch.\n\
  all:\n\
     shortcut for clean,dojo,shrink,touch,application,deploy.\n\
Available Targets: (default is 'all' if nothing is specified)\n\
  development:\n\
     Includes debugging and testing code in the development directory.\n\
  release:\n\
     Includes production-quality code in the release directory.\n\
  debug:\n\
     Includes easier to debug code in the release directory. If\n\
	 both debug and release are used, debug will override release.\n\
  all:\n\
     Shortcut for development,target.");
    }
    
    var require = (function() {
    
        var loadedDojoScripts = [];
        var loadedMyScripts = [];
        var dojoScriptPath = params.buildScriptsPath + "jslib/";
        
        return function(source, name) {
            var path;
            var registry;
            switch (source) {
                case "dojo":
                    path = dojoScriptPath + name + ".js";
                    registry = loadedDojoScripts;
                    break;
                case "my":
                    path = params.scriptPath + name + ".js";
                    registry = loadedMyScripts;
                    break;
                default:
                    throw "Unknown script source";
            }
            if (registry.indexOf(name) == -1) {
                load.apply(global, [path]);
                registry.push(name);
            }
        }
        
    })();
    
    
    
    (function() {
        params.actions = {};
        params.targets = {};
        
        argActions = (scriptArguments[1] && scriptArguments[1].split("+")) || ["usage"];
        argTargets = scriptArguments[2] && scriptArguments[2].split("+") || ["all"];
		
        
        for (var i = 0; i < argActions.length; i++) {
            switch (argActions[i]) {
				case "usage":
                case "dojo":
                case "shrink":
                case "touch":
                case "clean":
                case "application":
                case "deploy":
                    params.actions[argActions[i]] = true;
                    break;
                case "allDojo":
                    params.actions.dojo = true;
                    params.actions.shrink = true;
                    params.actions.touch = true;
                    break;
                case "all":
                    params.actions.clean = true;
                    params.actions.dojo = true;
                    params.actions.shrink = true;
                    params.actions.touch = true;
                    params.actions.application = true;
                    params.actions.deploy = true;
                    break;
                case "development":
                case "release":
				case "debug":
                    params.actions.application = true;
                    params.targets[argActions[i]] = true;
                    print("Target: " + argActions[i]);
                    // clear out the targets, lest they did 
                    // make development all, expecting it to be like make all development,
                    // only to find out it is more like make application development,release
                    argTargets = [];
                    break;
                default:
                    print("Unknown action: " + argActions[i]);
            }
        }
        for (var i = 0; i < argTargets.length; i++) {
            switch (argTargets[i]) {
                case "development":
                case "release":
				case "debug":
                    params.targets[argTargets[i]] = true;
                    print("Target: " + argTargets[i]);
                    break;
                case "all":
                    params.targets.release = true;
                    print("Target: release");
                    params.targets.development = true;
                    print("Target: development");
            }
        }
		
		// debug also turns on release, since only a few scripts actually
		// know anything about debug.
		if (params.targets.debug) {
			params.targets.release = true;
		}
        
        
    })();
    
	print("Starting build at: " + (new Date()).toString());
	params.actions.usage && showUsage();
    params.actions.clean && load(params.scriptPath + "cleanApplication.js");
    params.actions.dojo && load(params.scriptPath + "buildDojo.js");
    params.actions.shrink && load(params.scriptPath + "shrinkDojo.js");
    params.actions.touch && load(params.scriptPath + "touchDojo.js");
    params.actions.application && load(params.scriptPath + "buildApplication.js");
    params.actions.deploy && load(params.scriptPath + "deployApplication.js");
	print("Build completed at: " + (new Date()).toString());
    
} finally {
    printer.close();
}
