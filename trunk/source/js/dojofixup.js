// The code here is meant to fix this bug: http://bugs.dojotoolkit.org/ticket/6411
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
/*
 * This contains a fixes to allow for onbeforeunload to work.
 * It *must* be called before any other code is 'required'.
 */
(function() {
    var d = dojo;
    
    if (d._unloaders.length > 0) {
        throw "A recent upgrade to the dojo libraries has broken an important bug fix. " +
        "It's possible that this upgrade also fixes the bug, so there may be good news."
    }
    
    var _w = window;
    // This does not override any other existing event, since this is a
    // private variable in dojo/_loader/hostenv_browser.js. So, I don't
    // have to worry too much about it not working for other window events.
    // NOTE: This is not intended to be a patch, the original function
    // should not be changed this way.
    var _handleNodeEvent = function(/*String*/evtName, /*Function*/ fp) {
        var _a = _w.attachEvent || _w.addEventListener;
        evtName = _w.attachEvent ? evtName : evtName.substring(2);
        _a(evtName, function() {
			var result = fp.apply(_w, arguments);
            if (typeof result != 'undefined') {
                return result;
            }
            // otherwise, don't return anything, to make absolutely
            // sure that the function returns the kind of undefined
            // the browser is expecting.
        }, false);
    };
    
    
    
    var _onUnloadAttached = 0;
    // NOTE: This is unchanged, it is only re-declared to take care of our rewritten
    // private handleNodeEvent.
    d.addOnUnload = function(/*Object?|Function?*/obj, /*String|Function?*/ functionName) {
    
        d._onto(d._unloaders, obj, functionName);
        if (!_onUnloadAttached) {
            _onUnloadAttached = 1;
            _handleNodeEvent("onbeforeunload", dojo.unloaded);
        }
    };
    
    d._beforeUnloaders = [];
    // And here is the beginning of the fix. This *is* a new method.
    d.addOnBeforeUnload = function(/*Object?|Function?*/obj, /*String|Function?*/ functionName) {
    
        // NOTE: Can't use the following, because it doesn't allow the function to return.
        // d._onto(d._beforeUnloaders, obj, functionName);
        if (!functionName) {
            d._beforeUnloaders.push(obj);
        } else if (functionName) {
            var func = (typeof functionName == "string") ? obj[functionName] : functionName;
            d._beforeUnloaders.push(function() {
                var result = func.call(obj);
                if (typeof result != 'undefined') {
                    return result;
                }
            });
        }
        if (!_onUnloadAttached) {
            _onUnloadAttached = 1;
            _handleNodeEvent("onbeforeunload", dojo.unloaded);
        }
    };
    
    // And finally, the powerhorse, this is the only other
    // method I am actually *changing*
    // All I'm doing here is handling the beforeUnload.
    // Unlike the unloaders, beforeUnload is not cleared out as it
    // happens, since if one returns, it has a chance of cancelling
    // the onunload, and the unloading does not continue.
    // NOTE: There is still one 'bug': if the user chooses to allow
	// the unload, the unloaders will never be called. 
    // But, in my opinion it shouldn't matter, should it?
    // since the browser should tear all of the javascript members out
    // of memory... right? 
	// The only time where this will be an actual problem is if I
	// need to 'log out' of a server or something, or if I put in
	// some advanced system of holding file handles in memory
	// (not sure how I'd do that). I'll just have to keep that in mind
	// when I end up doing things like that, and find workarounds.
	// There should always be a workaround for a failur to log out,
	// anyway. 
    d.unloaded = function(evt) {
        var bu = d._beforeUnloaders;
        for (var i = (bu.length - 1); i >= 0; i--) {
            var result = (bu[i])();
            if ((typeof result != 'undefined') && (typeof result == 'string') && (result !== "")) {
				// NOTE: I thought this was just IE that used this, but apparently
				// so does Firefox in this particular case (probably because we're using
				// AddEventListener instead of setting the window.onbeforeunload directly).
                evt.returnValue = result;
				return result;
            }
            // otherwise, don't return anything, to make absolutely
            // sure that the function returns the kind of undefined
            // the browser is expecting.
            // NOTE: This does not go on to check the others if one
            // returns. It also avoids unloading if one returns.
        }
        var mll = d._unloaders;
        while (mll.length) {
            (mll.pop())();
        }
    }
    
    
    
    
})()
