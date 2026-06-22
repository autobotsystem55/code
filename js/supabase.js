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
      stock: r.stock || {},
      trackInventory: !!r.track_inventory,
      continueSelling: !!r.continue_selling,
      lowStockThreshold: (r.low_stock_threshold != null) ? r.low_stock_threshold : 5,
      sizeChart: r.size_chart || null,
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
    // update only the stock-related columns
    updateStock: function (id, fields) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('products').update(fields).eq('id', id);
    },
    // decrement stock for purchased items (server-side, only for tracked products)
    decrementStock: function (items) {
      if (!window.sb) return Promise.resolve({});
      return window.sb.rpc('decrement_stock', { p_items: items });
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

    // ---- discount codes ----
    validateDiscount: function (code, subtotal) {
      if (!window.sb) return Promise.resolve({ data: null, error: null });
      return window.sb.rpc('validate_discount', { p_code: code, p_subtotal: subtotal })
        .then(function (r) { return { data: (r.data && r.data[0]) || null, error: r.error }; });
    },
    // 自动套用的购物车级优惠（买一送一 / 第N件半价）；返回多条，结账页自行按购物车计算并择优
    autoDiscounts: function (subtotal) {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.rpc('auto_discounts', { p_subtotal: subtotal || 0 });
    },
    redeemDiscount: function (code) {
      if (!window.sb) return Promise.resolve({});
      return window.sb.rpc('redeem_discount', { p_code: code });
    },
    allDiscounts: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('discount_codes').select('*').order('created_at', { ascending: false });
    },
    upsertDiscount: function (row) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('discount_codes').upsert(row);
    },
    deleteDiscount: function (code) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('discount_codes').delete().eq('code', code);
    },

    // ---- store credit (购物金) ----
    // Current user's balance. Returns 0 on any error / not-signed-in / table-missing,
    // so callers can safely treat "no credit" as the default and never break.
    creditBalance: function () {
      if (!window.sb) return Promise.resolve(0);
      return window.sb.auth.getUser().then(function (res) {
        var u = res && res.data && res.data.user; if (!u) return 0;
        return window.sb.from('store_credit_accounts').select('balance').eq('user_id', u.id).maybeSingle()
          .then(function (r) { return (r && r.data && Number(r.data.balance)) || 0; }, function () { return 0; });
      }, function () { return 0; });
    },
    // Current user's ledger (history). Empty on error.
    creditLedger: function (limit) {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('store_credit_ledger').select('*')
        .order('created_at', { ascending: false }).limit(limit || 50);
    },
    // Spend credit at checkout (server checks balance atomically). p_order links the order.
    redeemCredit: function (amount, orderNumber) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.rpc('redeem_store_credit', { p_amount: amount, p_order: orderNumber || null });
    },
    // Admin: all members with their balances.
    adminCreditOverview: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.rpc('admin_credit_overview');
    },
    // Admin: manually grant (+) or deduct (−) a member's credit, with a reason note.
    adminAdjustCredit: function (userId, delta, note) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.rpc('admin_adjust_credit', { p_user: userId, p_delta: delta, p_note: note || null });
    },

    // ---- cash vouchers (现金券) ----
    // Current user's vouchers (RLS limits to own). Empty on error.
    myVouchers: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('vouchers').select('*').order('created_at', { ascending: false }).limit(50);
    },
    // Redeem one voucher at checkout (server checks owner/used/expiry/min-spend).
    redeemVoucher: function (id, orderNumber, subtotal) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.rpc('redeem_voucher', { p_id: id, p_order: orderNumber || null, p_subtotal: subtotal || 0 });
    },
    // Birthday voucher — safe to call on page load; issues at most once per year, only in the birthday month.
    claimBirthdayVoucher: function () {
      if (!window.sb) return Promise.resolve({ data: null, error: null });
      return window.sb.rpc('claim_birthday_voucher');
    },
    // Admin: issue a voucher to a member.
    adminIssueVoucher: function (userId, amount, minSpend, note, expiryDays) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.rpc('admin_issue_voucher', { p_user: userId, p_amount: amount, p_min: minSpend || 0, p_note: note || null, p_expiry_days: expiryDays || 0 });
    },

    // ---- bundles / sets ----
    allBundles: function () {
      if (!window.sb) return Promise.resolve({ data: [], error: null });
      return window.sb.from('bundles').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true });
    },
    upsertBundle: function (row) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('bundles').upsert(row);
    },
    deleteBundle: function (id) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.from('bundles').delete().eq('id', id);
    },

    // look up the email linked to a phone number (for phone-based sign-in)
    emailByPhone: function (phone) {
      if (!window.sb) return Promise.resolve({ data: null, error: { message: 'not configured' } });
      return window.sb.from('profiles').select('email').eq('phone', phone).maybeSingle();
    },

    // current user's full profile row
    getProfile: function () {
      if (!window.sb) return Promise.resolve({ data: null, error: { message: 'not configured' } });
      return window.sb.auth.getUser().then(function (res) {
        var u = res && res.data && res.data.user;
        if (!u) return { data: null, error: { message: 'not signed in' } };
        return window.sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
      });
    },

    // update any columns on the current user's profile row
    updateProfile: function (fields) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.auth.getUser().then(function (res) {
        var u = res && res.data && res.data.user;
        if (!u) return { error: { message: 'not signed in' } };
        return window.sb.from('profiles').update(fields).eq('id', u.id);
      });
    },
  };

  window.Auth = {
    enabled: configured,
    signUp: function (email, password, fullName, phone, birthday) {
      return window.sb.auth.signUp({
        email: email, password: password,
        options: { data: { full_name: fullName || '', phone: phone || '' } }
      }).then(function (res) {
        if (res.data && res.data.user && window.sb) {
          var prof = {
            id: res.data.user.id,
            email: email,
            full_name: fullName || '',
            phone: phone || ''
          };
          if (birthday) prof.birthday = birthday;   // YYYY-MM-DD (optional)
          window.sb.from('profiles').upsert(prof).then(function () {}, function () {});
        }
        return res;
      });
    },
    signIn: function (email, password) {
      return window.sb.auth.signInWithPassword({ email: email, password: password });
    },
    signOut: function () { return window.sb.auth.signOut(); },
    updatePassword: function (newPassword) {
      if (!window.sb) return Promise.resolve({ error: { message: 'not configured' } });
      return window.sb.auth.updateUser({ password: newPassword });
    },
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
        // bundle visibility switches (booleans — copy even when false)
        ['bundlesEnabled', 'bundlesOnHome'].forEach(function (k) {
          if (d[k] !== undefined && d[k] !== null) window.STORE_CONFIG[k] = d[k];
        });
        // shipping zones array (overrides flat-rate when present)
        if (Array.isArray(d.shippingZones) && d.shippingZones.length) {
          window.STORE_CONFIG.shippingZones = d.shippingZones;
        }
        // size chart object (full object — admin manages enabled/columns/rows/note)
        if (d.sizeChart && typeof d.sizeChart === 'object') {
          window.STORE_CONFIG.sizeChart = d.sizeChart;
        }
        // store credit (购物金) rules — earn + redeem config (managed in admin)
        if (d.storeCredit && typeof d.storeCredit === 'object') {
          window.STORE_CONFIG.storeCredit = d.storeCredit;
        }
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
