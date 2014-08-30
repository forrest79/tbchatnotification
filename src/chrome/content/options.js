(function() {

this.tbchatnotification = this.tbchatnotification || {};

"use strict";

var options = {

	/**
	* Show select file dialog and save path to textbox.
	* @param string elementId
	*/
	getFile : function(elementId) {
		try {
			var textbox = this.$(elementId);
		
			var nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes['@mozilla.org/filepicker;1']
				.createInstance(nsIFilePicker);

			if (textbox.value) {
				var initDir = Components.classes['@mozilla.org/file/local;1']
					.createInstance(Components.interfaces.nsIFile);
				initDir.initWithPath(textbox.value);

				if (!initDir.isDirectory()) {
					initDir = initDir.parent;
				}

				fp.displayDirectory = initDir;
			}

			fp.init(window, this.string('selectfile'), nsIFilePicker.modeOpen);
			fp.appendFilter(this.string('supportedfiles'), '*.mp3; *.wav; *.aac; *.mp4; *.ogg; *.webm;');
			var dialog = fp.show();
			if (dialog == nsIFilePicker.returnOK){
				textbox.value = fp.file.path;
			}
		} catch (e) {
			dump(e);
		}
	},

	/**
	 * Update control properties.
	 */
	updateControls : function() {
		this.$('ShowBodyCheckbox').disabled = !this.$('ShowNotification').value;
		this.$('PlaySoundFocusedCheckbox').disabled = !this.$('PlaySound').value;
	},

	/**
	* Get localized string.
	* @return string
	*/
	string : function(string) {
		return this.$('Strings').getString('options.' + string);
	},

	/**
	* Get element on document.
	* @param string id
	* @return object XUL
	*/
	$ : function(id) {
		var element = document.getElementById('tbchatnotification' + id);
		if (element) {
			return element;
		} else {
			throw 'No element "' + id + '".';
		}
	}

}

/**
 * Load options...
 */
window.addEventListener('load', function() {
	if (Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULRuntime).OS != 'WINNT') {
		options.$('TrayIconCheckbox').hidden = true;
		window.sizeToContent();
	}

	options.updateControls();
}, false);

tbchatnotification.options = options;

})();
