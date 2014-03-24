/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/ */

#include <windows.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct _mouseevent_t {
	int button;
	int clickCount;
	long x;
	long y;
	int keys;
} mouseevent_t;

typedef void (*mouseevent_callback_t)(void *handle, mouseevent_t *event);
typedef void (*minimize_callback_t)(void *handle, int type);

DWORD WINAPI ThreadProc(LPVOID lpParam);
static LRESULT CALLBACK WndProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

void TbChatNotification_Init(mouseevent_callback_t callback);
void TbChatNotification_Destroy();

BOOL TbChatNotification_CreateIcon(wchar_t *title);
BOOL TbChatNotification_DestroyIcon();

void* TbChatNotification_GetBaseWindow(wchar_t *title);
void TbChatNotification_RestoreWindow(void *handle);

#ifdef __cplusplus
} // extern "C"
#endif
