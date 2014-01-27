"use strict";

var options = {

	/**
	 * Show select file dialog and save path to textbox.
	 * @param textbox XUL element
	 */
	getFile : function(textbox) {
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes['@mozilla.org/filepicker;1']
							 .createInstance(nsIFilePicker);

		if (textbox.value) {
			var initDir = Components.classes['@mozilla.org/file/local;1']
											.createInstance(Components.interfaces.nsILocalFile);
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
	},

	/**
	 * Get localized string.
	 * @return string
	 */
	string : function(string) {
		return document.getElementById('strings').getString('options.' + string);
	}

}
