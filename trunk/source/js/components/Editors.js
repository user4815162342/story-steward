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
dojo.provide("my.Editors");
dojo.require("dijit.Editor");
dojo.require("dijit._editor.plugins.AlwaysShowToolbar");
dojo.require("dijit._editor.plugins.LinkDialog");
dojo.require("dijit._editor.plugins.TextColor");
dojo.require("dijit._editor.plugins.FullScreen");
dojo.declare("my.MemoEditor", [dijit.Editor], {

    charLimit: 1000,
    
    height: '',
    
    minHeight: '5em',
    
    plugins: [{
        name: 'dijit._editor.plugins.EnterKeyHandling',
        blockModeForEnter: 'P'
    }, 'dijit._editor.plugins.AlwaysShowToolbar', 'undo', 'redo', '|', 'cut', 'copy', 'paste', '|', 'bold', 'italic'],
    
    _setValueAttr: function(value) {
        this.inherited(arguments);
        this.validate(value);
    },
    
    validationMessage: "",
    
    displayMessage: function(text) {
        dijit.hideTooltip(this.domNode);
        if (text && this._focused) {
            dijit.showTooltip(text, this.domNode);
        }
    },
    
    // NOTE: Basically, all this does it create a 'limit' to the size of these text fields, without
    // actually enforcing this limit. This is to prevent the description from being used for huge
    // amounts of notes, causing the project file to get too large and unwieldly, and the UI to
    // get ugly.
	// NOTE: Naturally, this character limit is not exact, as the number also includes all of the
	// html tags included as well. Although, since it still represents memory size, that should
	// be appropriate, right? 
    // FUTURE: Future versions may actually enforce this limit, or it may remove this limit 
    // and find another way around the potential issues (fallback to clob?)    
    validate: function(text) {
        if ((text || this.get('value')).length > this.charLimit) {
			this.validationMessage = "More than about " + this.charLimit + " characters in this field may be lost."; 
            this.displayMessage(this.validationMessage);
            if (this.editorObject) {
                var content = (this.editorObject.contentWindow || this.editorObject.contentDocument);
                if (content.document) {
                    content = content.document;
                }
                content.body.style.backgroundColor = "#FFFF00";
                
            }
        } else {
			this.validationMessage = "";
            this.displayMessage(this.validationMessage);
            if (this.editorObject) {
                var content = (this.editorObject.contentWindow || this.editorObject.contentDocument);
                if (content.document) {
                    content = content.document;
                }
                content.body.style.backgroundColor = "#FFFFFF";
            }
        }
        
    },
    
    onKeyUp: function(e) {
        this.inherited(arguments);
        this.validate();
    },
    
    _onBlur: function() {
		this.inherited(arguments);
        this.displayMessage('');
    },
	
	_onFocus: function() {
		this.inherited(arguments);
		this.displayMessage(this.validationMessage);
	}
	
	
    
});

dojo.declare("my.NoteEditor", [dijit.Editor], {

    plugins: [{
        name: 'dijit._editor.plugins.EnterKeyHandling',
        blockModeForEnter: 'P'
    }, 'dijit._editor.plugins.AlwaysShowToolbar', 'undo', 'redo', '|', 'cut', 'copy', 'paste', '|', 'bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'foreColor', 'hiliteColor', 'removeFormat', '|', 'insertOrderedList', 'insertUnorderedList', 'indent', 'outdent', 'insertHorizontalRule', '|', 'justifyLeft', 'justifyRight', 'justifyCenter', 'justifyFull', '|', 'createLink', 'unlink', 'insertImage', '|', 'fullscreen']

});

dojo.declare("my.ContentEditor", [dijit.Editor], {

    plugins: [{
        name: 'dijit._editor.plugins.EnterKeyHandling',
        blockModeForEnter: 'P'
    }, 'dijit._editor.plugins.AlwaysShowToolbar', 'undo', 'redo', '|', 'cut', 'copy', 'paste', '|', 'bold', 'italic', 'underline', 'strikethrough', 'hiliteColor', 'removeFormat', '|', 'insertOrderedList', 'insertUnorderedList', 'indent', 'outdent', '|', 'fullscreen']

});
