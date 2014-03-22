/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/ */

"use strict";

const EXPORTED_SYMBOLS = ['TrayIcon'];

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import('resource://gre/modules/ctypes.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Services = Object.create(Services);
XPCOMUtils.defineLazyServiceGetter(
	Services,
	'uuid',
	'@mozilla.org/uuid-generator;1',
	'nsIUUIDGenerator'
);
XPCOMUtils.defineLazyServiceGetter(
	Services,
	'res',
	'@mozilla.org/network/protocol;1?name=resource',
	'nsIResProtocolHandler'
);
XPCOMUtils.defineLazyServiceGetter(
	Services,
	'appstartup',
	'@mozilla.org/toolkit/app-startup;1',
	'nsIAppStartup'
);

const _directory = (function() {
	let u = Services.io.newURI(Components.stack.filename, null, null);
	u = Services.io.newURI(Services.res.resolveURI(u), null, null);
	if (u instanceof Ci.nsIFileURL) {
		return u.file.parent.parent;
	}
	throw new Error('not resolved');
})();

const _libraries = {
	'x86-msvc' : { m : 'trayicon_x86.dll', c : ctypes.jschar.ptr },
	'x86_64-msvc' : { m : 'trayicon_x86_64.dll', c : ctypes.jschar.ptr }
};

function loadLibrary({m , c}) {
	let resource = _directory.clone();
	resource.append('lib');
	resource.append(m);
	if (!resource.exists()) {
		throw new Error('XPCOMABI Library: ' + resource.path)
	}
	return [ctypes.open(resource.path), c];
}

var _window;

const abi_t = ctypes.default_abi;

const handle_t = ctypes.voidptr_t;

const mouseevent_t = ctypes.StructType(
	'mouseevent_t',
	[
		{ 'button' : ctypes.int },
		{ 'clickCount' : ctypes.int },
		{ 'x' : ctypes.long },
		{ 'y' : ctypes.long },
		{ 'keys' : ctypes.int },
	]
);

const mouseevent_callback_t = ctypes.FunctionType(
	ctypes.default_abi,
	ctypes.void_t, // retval
	[
		handle_t, // handle
		mouseevent_t.ptr, // event
	]
).ptr;

var traylib;
var char_ptr_t;
try {
	// Try to load the library according to XPCOMABI
	[traylib, char_ptr_t] = loadLibrary(_libraries[Services.appinfo.XPCOMABI]);
} catch (e) {
	// XPCOMABI yielded wrong results; try alternative libraries
	for (let [,l] in Iterator(_libraries)) {
		try {
			[traylib, char_ptr_t] = loadLibrary(l);
		} catch (e) {
			// no op
		}
	}
	if (!traylib) {
		throw new Error('No loadable library found!');
	}
}

const _Init = traylib.declare(
	'TbChatNotification_Init',
	abi_t,
	ctypes.void_t, // retval
	mouseevent_callback_t // callback
);
const _Destroy = traylib.declare(
	'TbChatNotification_Destroy',
	abi_t,
	ctypes.void_t // retval
);
const _CreateIcon = traylib.declare(
	'TbChatNotification_CreateIcon',
	abi_t,
	ctypes.int, // retval BOOL
	char_ptr_t // title
);
const _DestroyIcon = traylib.declare(
	'TbChatNotification_DestroyIcon',
	abi_t,
	ctypes.int // retval BOOL
);

const mouseevent_callback = mouseevent_callback_t(function mouseevent_callback(handle, event) {
	try {
		event = event.contents;
		if (_window) {
			let document = _window.document;
			let e = document.createEvent('MouseEvents');
			let et = 'TrayIconClick';
			if (event.clickCount == 2) {
				et = 'TrayIconDblClick';
			} else if (event.clickCount > 2) {
				et = 'TrayIconTriClick';
			}
			e.initMouseEvent(
				et,
				true,
				true,
				_window,
				0,
				event.x,
				event.y,
				0,
				0,
				(event.keys & (1<<0)) != 0,
				(event.keys & (1<<1)) != 0,
				(event.keys & (1<<2)) != 0,
				(event.keys & (1<<3)) != 0,
				event.button,
				document
			);
			document.dispatchEvent(e);
			return;
		}
		throw new Error('Window for mouse event not found!');
	} catch (ex) {
		Cu.reportError(ex);
	}
});

const TrayIcon = {

	init : function(window) {
		_Init(mouseevent_callback);
		_window = window;
	},

	destroy : function() {
		_Destroy();
	},

	show : function(title) {
		_CreateIcon(title);
	},

	close : function() {
		_DestroyIcon();
	}

};
