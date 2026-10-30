# Telegram Mini App SDK

`telegram-web-app.js` is an unmodified snapshot of the official SDK downloaded from
https://telegram.org/js/telegram-web-app.js on 30 October 2026.

SHA-256 of the downloaded bytes:
`124bdff7ba3fe86c8ba5143467afec21e020405e74abdb92cfdda6c0ee3b5908`

Serve this file from the same origin so a separate request to telegram.org cannot
hold the native loading screen open. `telegram-startup.js` signals readiness once
the initial HTML is available; authentication still validates Telegram initData on
the server. Review and update this snapshot deliberately when adopting SDK changes.
