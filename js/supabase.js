/* =====================================================================
   SUPABASE LAYER
   - connects to your Supabase project (config.js → supabaseUrl/anonKey)
   - DB.loadProducts(): pull live products from the DB; if the table is
     empty or unreachable, the site quietly keeps the local catalog
     (js/products.js) so it NEVER breaks.
   - DB.createOrder(): save an order to the `orders` table.
   - Auth: sign up / sign in / sign out / current user (Supabase Auth).
   - window.productsReady: a promise pages await before rendering products.
   Requires the Supabase JS SDK (loaded from CDN just before this file).
   ===================================================================== */
(function () {
  var CFG = window.STORE_CONFIG || {};
  var URL = (CFG.supabaseUrl || '').trim();
  var KEY = (CFG.supabaseAnonKey || '').trim();
  var hasSDK = !!(window.supabase && window.supabase.createClient);
  var configured = hasSDK && /^https?:\/\//.test(URL) && KEY.length > 20;

  if (configured) {
    window.sb = window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } else {
    console.info('%c[Supabase] not connected%c – using the local product catalog.',
      'color:#82213E;font-weight:600', 'color:inherit');
  }

  // Map a DB row (snake_case columns) to the shape the app already expects.
  function mapRow(r) {
    return {
      id: r.id,
      name: r.name,
      name_zh: r.name_zh,
      category: r.category,
      price: Number(r.price),
      compareAt: (r.compare_at != null) ? Number(r.compare_at) : undefined,
      badge: r.badge || undefined,
      description: r.description,
      description_zh: r.description_zh,
      sizes: r.sizes || [],
      colors: r.colors || [],
      images: r.images || [],
    };
  }

  window.DB = {
    configured: configured,

    // Returns true if it replaced the catalog with live DB data.
    loadProducts: function () {
      if (!window.sb) return Promise.resolve(false);
      return window.sb
        .from('products').select('*').eq('active', true)
        .order('sort', { ascending: true })
        .order('created_at', { ascending: true })
        .then(function (res) {
          if (res.error) { console.warn('[Supabase] products:', res.error.message); return false; }
          if (res.data && res.data.length) { window.PRODUCTS = res.data.map(mapRow); return true; }
          return false; // empty table → keep local fallback
        })
        .catch(function (e) { console.warn('[Supabase] products failed:', e); return false; });
    },

    // order: { order_number, user_id, email, customer, items, subtotal, shipping, total, currency }
    createOrder: function (order) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('orders').insert(order);
    },

    myOrders: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('orders').select('*').order('created_at', { ascending: false });
    },

    // ---- admin (writes are protected by RLS — only the admin email can save) ----
    allProducts: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('products').select('*')
        .order('sort', { ascending: true }).order('created_at', { ascending: true });
    },
    upsertProduct: function (row) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('products').upsert(row);
    },
    deleteProduct: function (id) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('products').delete().eq('id', id);
    },
    // true only if the logged-in user's profile has is_admin = true
    isAdmin: function () {
      if (!window.sb) return Promise.resolve(false);
      return window.sb.auth.getUser().then(function (res) {
        var u = res && res.data && res.data.user;
        if (!u) return false;
        return window.sb.from('profiles').select('is_admin').eq('id', u.id).single()
          .then(function (r) { return !!(r.data && r.data.is_admin); }, function () { return false; });
      });
    },
    allOrders: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('orders').select('*').order('created_at', { ascending: false });
    },
    updateOrderStatus: function (id, status) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('orders').update({ status: status }).eq('id', id);
    },
    allCustomers: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('profiles').select('*').order('created_at', { ascending: false });
    },
    getSettings: function () {
      if (!window.sb) return Promise.resolve({ data: null, error: null });
      return window.sb.from('settings').select('data').eq('id', 1).single();
    },
    saveSettings: function (data) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('settings').update({ data: data, updated_at: new Date().toISOString() }).eq('id', 1);
    },
  };

  window.Auth = {
    enabled: configured,
    signUp: function (email, password, fullName) {
      return window.sb.auth.signUp({ email: email, password: password, options: { data: { full_name: fullName || '' } } });
    },
    signIn: function (email, password) {
      return window.sb.auth.signInWithPassword({ email: email, password: password });
    },
    signOut: function () { return window.sb.auth.signOut(); },
    getUser: function () {
      return window.sb ? window.sb.auth.getUser() : Promise.resolve({ data: { user: null } });
    },
    onChange: function (cb) {
      if (window.sb) window.sb.auth.onAuthStateChange(function (_e, session) { cb(session ? session.user : null); });
    },
  };

  // Load shop settings from the DB and merge into STORE_CONFIG, so the admin's
  // Settings page actually changes the live store (brand, currency, shipping,
  // payment gateway). Safe: any failure keeps the js/config.js defaults.
  function loadSettings() {
    if (!window.sb) return Promise.resolve();
    return window.sb.from('settings').select('data').eq('id', 1).single().then(function (r) {
      var d = r && r.data && r.data.data;
      if (d && typeof d === 'object') {
        ['brand', 'tagline', 'email', 'currency', 'currencySymbol', 'pixelId',
         'freeShippingThreshold', 'shippingFlat', 'paymentLink', 'paymentMode'].forEach(function (k) {
          if (d[k] !== undefined && d[k] !== null && d[k] !== '') window.STORE_CONFIG[k] = d[k];
        });
      }
    }).catch(function () {});
  }

  // Pages await this before rendering. Always resolves (never blocks the store).
  window.productsReady = loadSettings().then(function () {
    // boot the Pixel now that the Pixel ID (admin setting > config.js) is known
    if (window.Pixel && Pixel.boot) { try { Pixel.boot(); } catch (e) {} }
    return window.DB.loadProducts();
  }).then(function () {
    if (window.applySettingsToChrome) { try { applySettingsToChrome(); } catch (e) {} }
    else if (window.updateCartUI) { try { updateCartUI(); } catch (e) {} }
    return true;
  });
})();
