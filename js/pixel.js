/* =====================================================================
   FACEBOOK / META PIXEL
   ---------------------------------------------------------------------
   Boots AFTER shop settings load (called by js/supabase.js), so the
   Pixel ID can be managed in the admin Settings page. Falls back to the
   pixelId in js/config.js. If no valid ID, tracking is safely disabled
   (logs to console instead of erroring).

   Events: PageView (boot), ViewContent, AddToCart, InitiateCheckout, Purchase.
   ===================================================================== */
(function () {
  var enabled = false, booted = false;

  function currency() { return (window.STORE_CONFIG || {}).currency || 'USD'; }
  function track(event, params) {
    if (enabled && window.fbq) fbq('track', event, params || {});
    else console.log('[Pixel:would-track]', event, params || {});
  }
  function lineItems(items) {
    return items.map(function (it) { return { id: String(it.id), quantity: it.qty || 1, item_price: it.price }; });
  }

  window.Pixel = {
    // Called once (from supabase.js) after settings merge into STORE_CONFIG.
    // Admin Settings → Pixel ID overrides config.js.
    boot: function () {
      if (booted) return;
      booted = true;
      var id = (window.STORE_CONFIG || {}).pixelId;
      if (!id || id === 'YOUR_PIXEL_ID') {
        console.info('%c[Pixel] disabled%c – add a Pixel ID in admin Settings (or js/config.js).',
          'color:#82213E;font-weight:600', 'color:inherit');
        return;
      }
      // --- official Meta Pixel base code ---
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', id);
      fbq('track', 'PageView');
      enabled = true;
    },
    get enabled() { return enabled; },

    viewContent: function (product) {
      track('ViewContent', {
        content_ids: [String(product.id)], content_name: product.name, content_category: product.category,
        content_type: 'product', value: product.price, currency: currency(),
      });
    },
    addToCart: function (product, qty) {
      track('AddToCart', {
        content_ids: [String(product.id)], content_name: product.name, content_type: 'product',
        contents: lineItems([{ id: product.id, qty: qty || 1, price: product.price }]),
        value: product.price * (qty || 1), currency: currency(),
      });
    },
    initiateCheckout: function (items, value) {
      track('InitiateCheckout', {
        content_ids: items.map(function (i) { return String(i.id); }), contents: lineItems(items),
        content_type: 'product', num_items: items.reduce(function (n, i) { return n + (i.qty || 1); }, 0),
        value: value, currency: currency(),
      });
    },
    purchase: function (items, value, orderId) {
      track('Purchase', {
        content_ids: items.map(function (i) { return String(i.id); }), contents: lineItems(items),
        content_type: 'product', num_items: items.reduce(function (n, i) { return n + (i.qty || 1); }, 0),
        value: value, currency: currency(), order_id: orderId,
      });
    },
  };
})();
