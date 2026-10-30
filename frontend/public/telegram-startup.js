/* Reveal the server-rendered Mini App without waiting for React or API calls. */
(function () {
  function ready() {
    var app = window.Telegram && window.Telegram.WebApp;
    if (!app) return;
    app.ready();
    if (app.initData) app.expand();
    window.dispatchEvent(new Event('fs-telegram-sdk-ready'));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
