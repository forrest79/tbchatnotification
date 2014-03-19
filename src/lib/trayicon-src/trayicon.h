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

void TbChatNotification_Init();
void TbChatNotification_Destroy();

BOOL TbChatNotification_CreateIcon(void *handle, wchar_t *title, mouseevent_callback_t callback);
BOOL TbChatNotification_DestroyIcon(void *handle);

void* TbChatNotification_GetBaseWindow(wchar_t *title);

#ifdef __cplusplus
} // extern "C"
#endif
