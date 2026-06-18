/* =====================================================================
   FACEBOOK / META PIXEL
   ---------------------------------------------------------------------
   Loaded in the <head> of every page so PageView fires immediately.
   Standard e-commerce events (the same ones Shopify sends) are exposed
   through the global `Pixel` helper and called from store.js / pages.

   Events implemented:
     PageView         - every page (here)
     ViewContent      - product detail page
     AddToCart        - add-to-cart / quick-add
     InitiateCheckout - checkout page load
     Purchase         - order confirmation page
   ===================================================================== */
(function () {
  var cfg = window.STORE_CONFIG || {};
  var id = cfg.pixelId;
  var enabled = !!id && id !== 'YOUR_PIXEL_ID';

  if (enabled) {
    // --- Official Meta Pixel base code ---
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', id);
    fbq('track', 'PageView');
  } else {
    // Dev mode: log what WOULD be sent so you can verify wiring before adding the ID.
    console.info(
      '%c[Pixel] disabled%c – add your Pixel ID in js/config.js to start tracking.',
      'color:#A8503A;font-weight:600', 'color:inherit'
    );
  }

  function track(event, params) {
    if (enabled && window.fbq) {
      fbq('track', event, params || {});
    } else {
      console.log('[Pixel:would-track]', event, params || {});
    }
  }

  // Build the {currency, value, content_ids, contents, content_type} payload Meta expects.
  function lineItems(items) {
    return items.map(function (it) {
      return { id: String(it.id), quantity: it.qty || 1, item_price: it.price };
    });
  }

  window.Pixel = {
    enabled: enabled,

    viewContent: function (product) {
      track('ViewContent', {
        content_ids: [String(product.id)],
        content_name: product.name,
        content_category: product.category,
        content_type: 'product',
        value: product.price,
        currency: (window.STORE_CONFIG || {}).currency || 'USD',
      });
    },

    addToCart: function (product, qty) {
      track('AddToCart', {
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: 'product',
        contents: lineItems([{ id: product.id, qty: qty || 1, price: product.price }]),
        value: product.price * (qty || 1),
        currency: (window.STORE_CONFIG || {}).currency || 'USD',
      });
    },

    initiateCheckout: function (items, value) {
      track('InitiateCheckout', {
        content_ids: items.map(function (i) { return String(i.id); }),
        contents: lineItems(items),
        content_type: 'product',
        num_items: items.reduce(function (n, i) { return n + (i.qty || 1); }, 0),
        value: value,
        currency: (window.STORE_CONFIG || {}).currency || 'USD',
      });
    },

    purchase: function (items, value, orderId) {
      track('Purchase', {
        content_ids: items.map(function (i) { return String(i.id); }),
        contents: lineItems(items),
        content_type: 'product',
        num_items: items.reduce(function (n, i) { return n + (i.qty || 1); }, 0),
        value: value,
        currency: (window.STORE_CONFIG || {}).currency || 'USD',
        order_id: orderId,
      });
    },
  };
})();
