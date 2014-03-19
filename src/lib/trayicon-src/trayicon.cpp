/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/ */

#include <windows.h>
#include <string.h>
#include <new>

#include "trayicon.h"
#include "resource.h"

static const wchar_t kTrayMessage[]  = L"_TBCHATNOTIFICATION_TrayMessageW";
static const wchar_t kTrayCallback[]  = L"_TBCHATNOTIFICATION_TrayCallbackW";
static const wchar_t kOldProc[] = L"_TBCHATNOTIFICATION_WRAPPER_OLD_PROC";

static const wchar_t kIcon[] = L"_TBCHATNOTIFICATION_ICON";
static const wchar_t kIconClick[] = L"_TBCHATNOTIFICATION_ICON_CLICK";
static const wchar_t kIconData[] = L"_TBCHATNOTIFICATION_ICON_DATA";
static const wchar_t kIconMouseEventProc[] = L"_TBCHATNOTIFICATION_ICON_MOUSEEVENTPROC";

typedef BOOL (WINAPI *pChangeWindowMessageFilter)(UINT message, DWORD dwFlag);
#ifndef MGSFLT_ADD
	// Not a Vista SDK
	#define MSGFLT_ADD 1
	#define MSGFLT_REMOVE 2
#endif

static UINT WM_TASKBARCREATED = 0;
static UINT WM_TRAYMESSAGE = 0;
static UINT WM_TRAYCALLBACK = 0;

HINSTANCE trayInstance = NULL;

/**
 * DllMain entry
 */

BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID lpReserved) {
	trayInstance = hInstance;
	return TRUE;
}

/**
 * Helper function that will allow us to receive some broadcast messages on Vista
 * (We need to bypass that filter if we run as Administrator, but the orginating process
 * has less priviledges)
 */
static void AdjustMessageFilters(UINT filter)
{
	HMODULE user32 = LoadLibraryW(L"user32.dll");
	if (user32 != 0)
	{
		pChangeWindowMessageFilter changeWindowMessageFilter = reinterpret_cast<pChangeWindowMessageFilter>(GetProcAddress(user32, "ChangeWindowMessageFilter"));
		if (changeWindowMessageFilter != 0)
		{
			changeWindowMessageFilter(WM_TASKBARCREATED, filter);
		}
		FreeLibrary(user32);
	}
}

/**
 * Helper class to get Windows Version information
 */
class OSVersionInfo : public OSVERSIONINFOEXW
{
public:
	OSVersionInfo()
	{
		dwOSVersionInfoSize = sizeof(OSVERSIONINFOEXW);
		::GetVersionExW(reinterpret_cast<LPOSVERSIONINFOW>(this));
	}
	bool isVistaOrLater()
	{
		return dwMajorVersion >= 6;
	}
};

/**
 * Helper: Subclassed Windows WNDPROC
 */
static LRESULT CALLBACK WndProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
	if (::GetPropW(hwnd, kIcon) == (HANDLE)0x1) {
		// Icon stuff

		// This is a badly documented custom broadcast message by explorer
		if (uMsg == WM_TASKBARCREATED)
		{
			// Try to get the platform icon
			NOTIFYICONDATAW *iconData = reinterpret_cast<NOTIFYICONDATAW*>(GetPropW(hwnd, kIconData));
			if (iconData == 0) {
				goto WndProcEnd;
			}
			// The taskbar was (re)created. Add ourselves again.
			Shell_NotifyIconW(NIM_ADD, iconData);
		}
		else if (uMsg == WM_ENDSESSION)
		{
			// Need to show again
			SendMessage(hwnd, WM_TRAYCALLBACK, 0, 1);
			goto WndProcEnd;
		}
		else if (uMsg == WM_TRAYMESSAGE) // We got clicked. How exciting, isn't it.
		{
			mouseevent_t *event = new(std::nothrow) mouseevent_t;
			if (!event) {
				goto WndProcEnd;
			}
			WORD button = LOWORD(lParam);
			switch (button)
			{
				case WM_LBUTTONDBLCLK :
				case WM_MBUTTONDBLCLK :
				case WM_RBUTTONDBLCLK :
					// According to http://msdn.microsoft.com/en-us/library/windows/desktop/ms645606%28v=vs.85%29.aspx
					// this will be followed by an UP message
					// So store the DBL click event and have it replayed later by the UP message
					// See GH-17
					::SetPropW(hwnd, kIconClick, (HANDLE)button);
					goto WndProcEnd;
			}
			event->clickCount = 0;
			switch (button)
			{
				case WM_LBUTTONUP :
					if (::GetPropW(hwnd, kIconClick) == (HANDLE)WM_LBUTTONDBLCLK)
					{
						event->clickCount = 2;
						button = WM_LBUTTONDBLCLK;
					}
					else
					{
						event->clickCount = 1;
					}
					::SetPropW(hwnd, kIconClick, (HANDLE)0);
					break;
				case WM_MBUTTONUP :
					if (::GetPropW(hwnd, kIconClick) == (HANDLE)WM_MBUTTONDBLCLK)
					{
						event->clickCount = 2;
						button = WM_MBUTTONDBLCLK;
					}
					else
					{
						event->clickCount = 1;
					}
					::SetPropW(hwnd, kIconClick, (HANDLE)0);
					break;
				case WM_RBUTTONUP :
					if (::GetPropW(hwnd, kIconClick) == (HANDLE)WM_RBUTTONDBLCLK)
					{
						event->clickCount = 2;
						button = WM_RBUTTONDBLCLK;
					}
					else
					{
						event->clickCount = 1;
					}
					::SetPropW(hwnd, kIconClick, (HANDLE)0);
					break;
				case NIN_KEYSELECT :
					event->clickCount = 1;
					::SetPropW(hwnd, kIconClick, (HANDLE)0);
					break;
			}

			switch (button)
			{
				case WM_LBUTTONUP :
				case WM_LBUTTONDBLCLK :
					event->button = 0;
					break;
				case WM_MBUTTONUP :
				case WM_MBUTTONDBLCLK :
					event->button = 1;
					break;
				case WM_RBUTTONUP :
				case WM_RBUTTONDBLCLK :
				case NIN_KEYSELECT :
					event->button = 2;
					break;
			}
			if (event->clickCount)
			{
				POINT wpt;
				if (GetCursorPos(&wpt) == TRUE)
				{
					event->x = wpt.x;
					event->y = wpt.y;

					event->keys = 0;
					if (::GetKeyState(VK_CONTROL) & 0x8000)
					{
						event->keys += (1<<0);
					}
					if (::GetKeyState(VK_MENU) & 0x8000)
					{
						event->keys += (1<<1);
					}
					if (::GetKeyState(VK_SHIFT) & 0x8000)
					{
						event->keys += (1<<2);
					}
					PostMessage(hwnd, WM_TRAYCALLBACK, 1, (LPARAM)event);
				}
				else
				{
					delete event;
				}
			}
			return 0;
		}
	}

	// Need to handle this in or own message or crash!
	// See https://bugzilla.mozilla.org/show_bug.cgi?id=671266
	if (uMsg == WM_TRAYCALLBACK)
	{
		if (wParam == 1)
		{
			mouseevent_t *event = reinterpret_cast<mouseevent_t*>(lParam);
			mouseevent_callback_t callback = reinterpret_cast<mouseevent_callback_t>(::GetPropW(hwnd, kIconMouseEventProc));
			if (event && callback)
			{
				callback(hwnd, event);
				::PostMessage(hwnd, WM_NULL, 0, 0L);
			}
			delete event;
		}

		return 0;
	}

WndProcEnd:
	// Call the old WNDPROC or at lest DefWindowProc
	WNDPROC oldProc = reinterpret_cast<WNDPROC>(::GetPropW(hwnd, kOldProc));
	if (oldProc != 0)
	{
		return ::CallWindowProcW(oldProc, hwnd, uMsg, wParam, lParam);
	}
	return ::DefWindowProcW(hwnd, uMsg, wParam, lParam);
}

void TbChatNotification_Init()
{
	// Get TaskbarCreated
	WM_TASKBARCREATED = RegisterWindowMessageW(L"TaskbarCreated");
	// We register this as well, as we cannot know which WM_USER values are already taken
	WM_TRAYMESSAGE = RegisterWindowMessageW(kTrayMessage);
	WM_TRAYCALLBACK = RegisterWindowMessageW(kTrayCallback);

	// Vista (Administrator) needs some love, or else we won't receive anything due to UIPI
	if (OSVersionInfo().isVistaOrLater()) {
		AdjustMessageFilters(MSGFLT_ADD);
	}
}

void TbChatNotification_Destroy()
{
	// Vista (Administrator) needs some unlove, see c'tor
	if (OSVersionInfo().isVistaOrLater()) {
		AdjustMessageFilters(MSGFLT_REMOVE);
	}
}

static void SetupWnd(HWND hwnd)
{
	if (::GetPropW(hwnd, kOldProc) == 0) {
		WNDPROC oldProc = reinterpret_cast<WNDPROC>(::SetWindowLongPtrW(hwnd, GWLP_WNDPROC, reinterpret_cast<LONG_PTR>(WndProc)));
		::SetPropW(hwnd, kOldProc, reinterpret_cast<HANDLE>(oldProc));
	}
}

BOOL TbChatNotification_CreateIcon(void *handle, wchar_t *title, mouseevent_callback_t callback)
{
	HWND hwnd = (HWND)handle;
	if (!hwnd)
	{
		return FALSE;
	}

	SetupWnd(hwnd);

	NOTIFYICONDATAW *iconData = new(std::nothrow) NOTIFYICONDATAW;
	if (!iconData)
	{
		return FALSE;
	}
	
	// Init the icon data according to MSDN
	iconData->cbSize = sizeof(NOTIFYICONDATAW);

	// Copy the title
	wcsncpy_s(iconData->szTip, title, 127);
	iconData->szTip[127] = '\0'; // Better be safe than sorry :p

	// Get the window icon
	HICON icon = ::LoadIcon(trayInstance, MAKEINTRESOURCE(IDI_TRAYICON));
	iconData->hIcon = icon;

	// Set the rest of the members
	iconData->hWnd = hwnd;
	iconData->uCallbackMessage = WM_TRAYMESSAGE;
	iconData->uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
	iconData->uVersion = 5;

	// Install the icon
	::Shell_NotifyIconW(NIM_ADD, iconData);
	::Shell_NotifyIconW(NIM_SETVERSION, iconData);

	SetupWnd(hwnd);
	::SetPropW(hwnd, kIconData, reinterpret_cast<HANDLE>(iconData));
	::SetPropW(hwnd, kIconMouseEventProc, reinterpret_cast<HANDLE>(callback));
	::SetPropW(hwnd, kIcon, reinterpret_cast<HANDLE>(0x1));

	return TRUE;
}

BOOL TbChatNotification_DestroyIcon(void *handle)
{
	HWND hwnd = (HWND)handle;
	if (!hwnd)
	{
		return FALSE;
	}

	SetupWnd(hwnd);
	::RemovePropW(hwnd, kIcon);

	NOTIFYICONDATAW *iconData = reinterpret_cast<NOTIFYICONDATAW *>(::GetPropW(hwnd, kIconData));
	if (iconData)
	{
		::Shell_NotifyIconW(NIM_DELETE, iconData);
		delete iconData;
	}
	::RemovePropW(hwnd, kIconData);

	::RemovePropW(hwnd, kIconMouseEventProc);

	return TRUE;
}

void* TbChatNotification_GetBaseWindow(wchar_t *title)
{
	void *rv = 0;
	if (!title)
	{
		return rv;
	}
	rv = ::FindWindow(0, title);
	return rv;
}

static void *operator new(size_t size, std::nothrow_t const &)
{
	return LocalAlloc(LPTR, size);
}

static void operator delete(void *ptr)
{
	if (ptr) {
		LocalFree(ptr);
	}
}

namespace std
{
	const nothrow_t nothrow;
}
