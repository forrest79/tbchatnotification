=== THIS REPOSITORY IS NO LONGER MAINTAINED ===


Thunderbird Chat Notification © Jakub Trmota, 2014 (https://forrest79.net)


Chat notification for Mozilla Thunderbird. Notification with alert (click on alert open conversation), sound, flash Thunderbird icon and tray icon (only for Windows).
@thanksto Wladimir Palant for inspiration with his chatnotification plugin


HOW TO USE:
===========
Install extension to Mozilla Thunderbird. Settings can be open from extensions list.

Settings:
---------
- you can choose if message body will be shown on alert (sender is shown always) for new message
- you can choose if sound will be played for new message
- you can choose custom sound
- you can make Thunderbird flash for new message


HOW TO BUILD:
=============
Run build/build-xpi.bat on Windows or build/build-xpi.sh on Linux. You need only ZIP utility in your global path.


HISTORY
=======
1.3.0 [2014-08-30] - Add option to enable/disable alert notification (automaticaly disable for Thunderbird 31>, because it has own alert notification and if both are active, no notification work)
1.2.0 [2014-03-20] - New icon, tray icon notification (only for Windows)
1.1.0 [2014-03-16] - Can flash Thunderbird icon, add posibility to notify for messages from multi-user chats
1.0.1 [2014-01-31] - Minimal Mozilla Thunderbird version set to 15 (first with chat), update depracated interfaces and some warnings, max sound time set to 5s
1.0.0 [2014-01-28] - First public version.


LICENSE
=======
Thunderbird Chat Notification is distributed under New BSD license. See license.txt.


https://github.com/forrest79/tbchatnotification
