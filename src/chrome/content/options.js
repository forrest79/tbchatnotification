(function() {

this.tbchatnotification = this.tbchatnotification || {};

"use strict";

var options = {

	/**
	* Show select file dialog and save path to textbox.
	* @param textboxId string
	*/
	getFile : function(textboxId) {
		try {
			var textbox = this.$(textboxId);
		
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
	* Get localized string.
	* @return string
	*/
	string : function(string) {
		return this.$('Strings').getString('options.' + string);
	},

	/**
	* Get element on document.
	* @param id string
	* @return object XUL
	*/
	$ : function(id) {
		id = 'tbchatnotification' + id;
		if (document.getElementById(id)) {
			return document.getElementById(id);
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
}, false);

tbchatnotification.options = options;

})();
