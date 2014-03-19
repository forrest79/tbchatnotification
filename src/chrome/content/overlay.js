(function() {

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const osWindows = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULRuntime).OS == 'WINNT';
	
var TbChatNotifier = {

	prefs : null,
	observer : null,
	observerTopics : {
		newDirectedIncomingMessage : 'new-directed-incoming-message',
		newText : 'new-text',
		unreadImCountChanged : 'unread-im-count-changed'
	},
	audio : null,
	
	trayicon : {
		instance : null,
		conversation : ''
	},

	options : {
		showbody : false,
		playsound : false,
		soundfile : '',
		trayicon : false,
		flashicon : false,
		mucnotify : false
	},

	/**
	* Load chat notifier.
	*/
	load : function() {
		// Load preferences
		var prefs = this.prefs = Components
		  .classes['@mozilla.org/preferences-service;1']
		  .getService(Ci.nsIPrefService)
		  .getBranch('extensions.tbchatnotification.');
		prefs.QueryInterface(Ci.nsIPrefBranch);
		
		var options = this.options;
		options.observe = function(subject, topic, data) {
			if (topic != 'nsPref:changed') {
				return;
			}

			switch(data) {
				case 'showbody' :
					this.showbody = prefs.getBoolPref('showbody');
					break;
				case 'playsound' :
					this.playsound = prefs.getBoolPref('playsound');
					break;
				case 'soundfile' :
					this.soundfile = prefs.getCharPref('soundfile');
					break;
				case 'trayicon' :
					this.trayicon = prefs.getBoolPref('trayicon');
					break;
				case 'flashicon' :
					this.flashicon = prefs.getBoolPref('flashicon');
					break;
				case 'mucnotify' :
					this.mucnotify = prefs.getBoolPref('mucnotify');
					break;
			}
		}
		prefs.addObserver('', options, false);
		
		options.showbody = prefs.getBoolPref('showbody');
		options.playsound = prefs.getBoolPref('playsound');
		options.soundfile = prefs.getCharPref('soundfile');
		options.trayicon = prefs.getBoolPref('trayicon');
		options.flashicon = prefs.getBoolPref('flashicon');
		options.mucnotify = prefs.getBoolPref('mucnotify');

		// Audio
		this.audio = new Audio();

		// Messages listener
		Cu.import('resource://gre/modules/XPCOMUtils.jsm');
		Cu.import('resource://gre/modules/Services.jsm');

		var imServices = {};
		Cu.import("resource:///modules/imServices.jsm", imServices);
		imServices = imServices.Services;

		var observerTopics = this.observerTopics;

		var notifier = this;
		var observer = this.observer = {
			observe: function(subject, topic, data) {
				if (subject.incoming && (((topic == observerTopics.newDirectedIncomingMessage) && !options.mucnotify) || ((topic == observerTopics.newText) && options.mucnotify))) {
					notifier.play();
					notifier.notify(subject.alias, subject.originalMessage, imServices.conversations.getUIConversation(subject.conversation).title);
				} else if (topic == observerTopics.unreadImCountChanged) {
					if (data == 0) {
						notifier.closeTrayIcon();
					}
				}
			},

			QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference])
		};

		for (var topic in observerTopics) {
			Services.obs.addObserver(observer, observerTopics[topic], true);
		}
	},

	/**
	 * Unload chat notifier.
	 */
	unload : function() {
		this.prefs.removeObserver('', this.options);

		var observer = this.observer,
			observerTopics = this.observerTopics;
			
		for (var topic in observerTopics) {
			Services.obs.removeObserver(observer, observerTopics[topic]);
		}
		
		this.closeTrayIcon()
	},

	/**
	* Play sound.
	*/
	play : function() {
		var audio = this.audio,
			options = this.options;

		if (options.playsound) {
			audio.src = (options.soundfile ? ('file://' + options.soundfile) : 'chrome://TbChatNotification/content/sound/notification.ogg') + '#t=,5';
			audio.play();
		}
	},

	/**
	 * Show non-modal alert message.
	 * @param from string
	 * @param message string
	 * @param conversation string
	 */
	notify : function(from, message, conversation) {
		var notifier = this,
			options = this.options;

		var title = this.string('newmessage') + ' ' + from,
			text = options.showbody ? (message > 128 ? (message.substring(0, 128) + '...') : message) : this.string('showmessage');

		try {
			var	listener = {
				observe : function(subject, topic, data) {
					if (topic == 'alertclickcallback') {
						this.openChat(data);
					}
				}
			}

			Cc['@mozilla.org/alerts-service;1']
				.getService(Ci.nsIAlertsService)
				.showAlertNotification('chrome://TbChatNotification/skin/icon32.png', title, text, true, conversation, listener);

		} catch(e) {
			// prevents runtime error on platforms that don't implement nsIAlertsService
		}

		if (osWindows && options.trayicon) {
			var trayicon = this.trayicon;
			
			trayicon.conversation = conversation;

			if (!trayicon.instance) {
				Cu.import('resource://TbChatNotification/trayiconservice.jsm');

				window.addEventListener('TrayDblClick', function(event) {
						notifier.openChat(trayicon.conversation);
				}, true);
			}
			
			trayicon.instance = TrayIconService.createIcon(window, title);
		}

		if (options.flashicon) {
			window.getAttention();
		}
	},

	/*
	 * Open chat tab with conversation.
	 * @param conversation string
	 */
	openChat : function(conversation) {
		try {
			var win = Services.wm.getMostRecentWindow('mail:3pane');
			if (win) {
				win.focus();
				win.showChatTab();

				var contacts = document.getElementById('contactlistbox');
				for (var i = 0; i < contacts.itemCount; i++) {
					var contact = contacts.getItemAtIndex(i);
					
					if (!contact || contact.hidden || (contact.localName != 'imconv')) {
						continue;
					} else if (contact.displayName == conversation) {
						contacts.selectedIndex = i;
						break;
					}
				}
			} else {
				window.openDialog('chrome://messenger/content/', '_blank',
					'chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar',
					null, {tabType: 'chat', tabParams: {}});
			}
		} catch (e) {
			// prevents runtime error
		}
	},

	/*
	 * Close tray icon.
	 */
	closeTrayIcon : function() {
		var trayicon = this.trayicon;
		if (trayicon.instance) {
			trayicon.instance.close();
		}
	},

	/**
	 * Get locale string.
	 * @param string
	 */
	string : function(string) {
		return this.$('Strings').getString('tbchatnotification.' + string);
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

};

/**
 * Load extension...
 */
window.addEventListener('load', function() {
	TbChatNotifier.load();
}, false);

/**
 * Unload extension...
 */
window.addEventListener('unload', function() {
	TbChatNotifier.unload();
}, false);

})();
