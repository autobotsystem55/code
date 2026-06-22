/* =====================================================================
   STORE ENGINE
   - injects the shared header / footer / cart drawer on every page
   - manages the cart (localStorage)
   - renders product cards & wires quick-add, drawer, nav, animations
   - calls the Pixel helpers at the right moments
   ===================================================================== */
(function () {
  var CFG = window.STORE_CONFIG || {};
  var CART_KEY = 'eclat_cart_v1';

  // i18n helpers (fall back gracefully if i18n.js isn't present)
  function T(k, v) { return window.t ? window.t(k, v) : k; }
  function PN(p) { return window.pName ? window.pName(p) : p.name; }
  function PC(p) { return window.pCat ? window.pCat(p) : p.category; }

  /* ---------- money ---------- */
  function money(n) {
    var sym = (window.STORE_CONFIG && window.STORE_CONFIG.currencySymbol) || '$';
    var v = Math.round(n * 100) / 100;
    return sym + (Number.isInteger(v) ? v.toString() : v.toFixed(2));
  }
  window.money = money;

  /* ---------- cart state ---------- */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartUI(); }
  function keyOf(it) {
    if (it.b) return 'B|' + it.bid + '|' + (it.items || []).map(function (x) { return x.id + ':' + (x.size || ''); }).join(',');
    return it.id + '|' + (it.size || '') + '|' + (it.color || '');
  }
  function cartCount() { return getCart().reduce(function (n, i) { return n + i.qty; }, 0); }
  function cartSubtotal() {
    return getCart().reduce(function (s, i) {
      if (i.b) return s + (i.price || 0) * i.qty;
      var p = findProduct(i.id); return p ? s + p.price * i.qty : s;
    }, 0);
  }
  // detailed lines (product joined) for pixel + summaries
  function cartLines() {
    return getCart().map(function (i) {
      if (i.b) {
        var nm = (window.LANG === 'zh' && i.name_zh) ? i.name_zh : i.name;
        return { b: 1, key: keyOf(i), id: i.bid, name: nm, price: i.price || 0, qty: i.qty, image: i.image,
          items: (i.items || []).map(function (x) { var cp = findProduct(x.id) || {}; return { id: x.id, name: cp.id ? PN(cp) : x.id, size: x.size, qty: x.qty || 1 }; }) };
      }
      var p = findProduct(i.id) || {};
      return { key: keyOf(i), id: i.id, name: p.id ? PN(p) : i.id, price: p.price || 0, qty: i.qty, size: i.size, color: i.color, image: (p.images || [])[0] };
    });
  }
  window.cartLines = cartLines;
  window.cartSubtotal = cartSubtotal;

  function addToCart(id, size, color, qty) {
    qty = qty || 1;
    var p = findProduct(id); if (!p) return;
    var cart = getCart();
    var item = { id: id, size: size, color: color, qty: qty };
    var existing = cart.find(function (c) { return keyOf(c) === keyOf(item); });
    if (existing) existing.qty += qty; else cart.push(item);
    saveCart(cart);
    if (window.Pixel) Pixel.addToCart(p, qty);
    toast(T('cart.added', { x: PN(p) }));
    openDrawer();
  }
  function setQty(key, delta) {
    var cart = getCart();
    var it = cart.find(function (c) { return keyOf(c) === key; });
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) cart = cart.filter(function (c) { return keyOf(c) !== key; });
    saveCart(cart);
  }
  function removeItem(key) {
    saveCart(getCart().filter(function (c) { return keyOf(c) !== key; }));
  }
  function addBundle(line) {
    if (!line || !line.items || !line.items.length) return;
    var cart = getCart();
    var item = { b: 1, bid: line.bid, name: line.name, name_zh: line.name_zh, image: line.image, price: line.price, qty: 1, items: line.items };
    var ex = cart.find(function (c) { return keyOf(c) === keyOf(item); });
    if (ex) ex.qty += 1; else cart.push(item);
    saveCart(cart);
    if (window.Pixel) Pixel.addToCart({ id: line.bid, name: line.name, price: line.price }, 1);
    toast(T('cart.added', { x: (window.LANG === 'zh' && line.name_zh) ? line.name_zh : line.name }));
    openDrawer();
  }
  window.Store = { addToCart: addToCart, addBundle: addBundle, getCart: getCart, money: money };

  /* ---------- icons ---------- */
  var ICON = {
    cart: '<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/></svg>',
  };

  /* ---------- nav model ---------- */
  var NAV = [
    { key: 'nav.shopAll', href: 'shop.html' },
    { key: 'nav.outerwear', href: 'shop.html?category=Outerwear' },
    { key: 'nav.knitwear', href: 'shop.html?category=Knitwear' },
    { key: 'nav.dresses', href: 'shop.html?category=Dresses' },
  ];
  function brandMarkup() {
    var b = (CFG.brand || 'STORE');
    return b;
  }

  // Called after DB settings load — refresh the brand wordmark + cart (currency)
  // so admin Settings changes show without a hard reload.
  window.applySettingsToChrome = function () {
    document.querySelectorAll('.brand').forEach(function (el) { el.innerHTML = brandMarkup(); });
    var showB = !!CFG.bundlesEnabled;
    document.querySelectorAll('.nav-bundles').forEach(function (el) { el.style.display = showB ? '' : 'none'; });
    if (window.updateCartUI) updateCartUI();
  };

  /* ---------- header / footer / drawer injection ---------- */
  function injectChrome() {
    var path = location.pathname.split('/').pop() || 'index.html';

    var navHtml = NAV.map(function (n) {
      var active = (n.href.split('?')[0] === path) ? ' class="is-active"' : '';
      return '<a href="' + n.href + '"' + active + '>' + T(n.key) + '</a>';
    }).join('');
    // bundles entry — shown only when admin enables it (toggled in applySettingsToChrome)
    var bActive = (path === 'bundles.html') ? ' is-active' : '';
    navHtml += '<a href="bundles.html" class="nav-bundles' + bActive + '" style="' + (CFG.bundlesEnabled ? '' : 'display:none') + '">' + T('nav.bundles') + '</a>';

    // ---------- mobile menu (sectioned, refined) ----------
    var isZh = (window.LANG === 'zh');
    var L = {
      menu:    isZh ? '菜单'   : 'Menu',
      shop:    isZh ? '选购'   : 'Shop',
      account: isZh ? '账户'   : 'Account',
      close:   isZh ? '关闭'   : 'Close',
      lang:    isZh ? 'English' : '中文',
    };
    function mLink(href, label, extraCls) {
      var active = (href.split('?')[0] === path) ? ' is-active' : '';
      var cls = 'mm__link' + active + (extraCls ? ' ' + extraCls : '');
      var style = (extraCls === 'nav-bundles' && !CFG.bundlesEnabled) ? ' style="display:none"' : '';
      return '<a class="' + cls + '" href="' + href + '"' + style + '>' +
        '<span>' + label + '</span><span class="mm__arrow" aria-hidden="true">→</span></a>';
    }
    var mShop =
      mLink('shop.html',                    T('nav.shopAll')) +
      mLink('shop.html?category=Outerwear', T('nav.outerwear')) +
      mLink('shop.html?category=Knitwear',  T('nav.knitwear')) +
      mLink('shop.html?category=Dresses',   T('nav.dresses')) +
      mLink('bundles.html',                 T('nav.bundles'), 'nav-bundles');
    var mAcct =
      mLink('account.html', T('acc.title'));

    var mobileMenuHtml =
      '<div class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
        '<div class="mm__head">' +
          '<span class="mm__eyebrow">' + L.menu + '</span>' +
          '<button class="mm__close" id="mmClose" aria-label="' + L.close + '">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="mm__scroll">' +
          '<div class="mm__group">' +
            '<div class="mm__label">' + L.shop + '</div>' + mShop +
          '</div>' +
          '<div class="mm__group">' +
            '<div class="mm__label">' + L.account + '</div>' + mAcct +
          '</div>' +
        '</div>' +
        '<div class="mm__foot">' +
          '<button class="mm__lang" id="mmLangBtn" type="button">' + L.lang + '</button>' +
          (CFG.email ? '<a class="mm__contact" href="mailto:' + CFG.email + '">' + CFG.email + '</a>' : '') +
        '</div>' +
      '</div>';

    var header = document.getElementById('site-header');
    if (header) {
      header.outerHTML =
        '<div class="announce"><div class="announce__track">' +
          repeatSpans([T('ann.shipping', { x: money(CFG.freeShippingThreshold) }),
                       T('ann.newSeason'), T('ann.returns'), T('ann.lasts')], 2) +
        '</div></div>' +
        '<header class="header" id="siteHeader"><div class="wrap header__inner">' +
          '<nav class="nav">' + navHtml + '</nav>' +
          '<button class="icon-btn burger" id="burger" aria-label="' + T('aria.menu') + '" aria-expanded="false">' + ICON.menu + '</button>' +
          '<a class="brand" href="index.html">' + brandMarkup() + '</a>' +
          '<div class="header__actions">' +
            '<button class="lang-btn" id="langBtn" aria-label="Language">' + T('lang.toggle') + '</button>' +
            '<a class="icon-btn" href="shop.html" aria-label="' + T('aria.search') + '">' + ICON.search + '</a>' +
            '<a class="icon-btn" href="account.html" aria-label="' + T('aria.account') + '">' + ICON.user + '</a>' +
            '<button class="icon-btn" id="cartBtn" aria-label="' + T('aria.cart') + '">' + ICON.cart +
              '<span class="cart-count" id="cartCount">0</span></button>' +
          '</div>' +
        '</div></header>' +
        mobileMenuHtml;
    }

    var footer = document.getElementById('site-footer');
    if (footer) {
      footer.outerHTML =
        '<footer class="footer"><div class="wrap">' +
          '<div class="footer__top">' +
            '<div class="footer__brand"><a class="brand" href="index.html">' + brandMarkup() + '</a>' +
              '<p>' + T('foot.tagline') + '</p></div>' +
            '<div><h4>' + T('foot.shop') + '</h4><ul>' +
              '<li><a href="shop.html">' + T('foot.all') + '</a></li>' +
              '<li class="nav-bundles" style="' + (CFG.bundlesEnabled ? '' : 'display:none') + '"><a href="bundles.html">' + T('nav.bundles') + '</a></li>' +
              '<li><a href="shop.html?category=Outerwear">' + T('nav.outerwear') + '</a></li>' +
              '<li><a href="shop.html?category=Knitwear">' + T('nav.knitwear') + '</a></li>' +
              '<li><a href="shop.html?category=Accessories">' + T('foot.accessories') + '</a></li></ul></div>' +
            '<div><h4>' + T('foot.help') + '</h4><ul>' +
              '<li><a href="policies.html#shipping">' + T('foot.shipReturns') + '</a></li>' +
              '<li><a href="mailto:' + (CFG.email || '') + '">' + T('foot.contact') + '</a></li></ul></div>' +
            '<div><h4>' + T('foot.studio') + '</h4><ul>' +
              '<li><a href="#">' + T('foot.story') + '</a></li>' +
              '<li><a href="#">' + T('foot.ig') + '</a></li></ul></div>' +
          '</div>' +
          '<div class="footer__bottom"><small>' + T('foot.rights', { y: thisYear(), brand: (CFG.brand || '') }) + '</small>' +
            '<nav style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px">' +
              '<a href="policies.html#privacy">' + T('foot.privacy') + '</a>' +
              '<a href="policies.html#returns">' + T('foot.returns') + '</a>' +
              '<a href="policies.html#shipping">' + T('foot.shippingP') + '</a>' +
              '<a href="policies.html#terms">' + T('foot.terms') + '</a>' +
            '</nav>' +
          '</div>' +
        '</div></footer>';
    }

    // cart drawer + overlay (appended to body)
    var drawer = document.createElement('div');
    drawer.innerHTML =
      '<div class="overlay" id="overlay"></div>' +
      '<aside class="drawer" id="drawer" aria-label="Cart">' +
        '<div class="drawer__head"><h3>' + T('cart.title') + '</h3><button class="drawer__close" id="drawerClose">' + T('cart.close') + '</button></div>' +
        '<div id="shipBar"></div>' +
        '<div class="drawer__items" id="drawerItems"></div>' +
        '<div class="drawer__foot" id="drawerFoot"></div>' +
      '</aside>';
    document.body.appendChild(drawer);
  }

  function repeatSpans(arr, times) {
    var one = arr.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    var out = ''; for (var i = 0; i < times; i++) out += one; return out;
  }
  function thisYear() {
    var m = document.lastModified && document.lastModified.match(/\d{4}/);
    return m ? m[0] : '2026';
  }

  /* ---------- cart UI ---------- */
  function updateCartUI() {
    var count = cartCount();
    var badge = document.getElementById('cartCount');
    if (badge) { badge.textContent = count; badge.classList.toggle('show', count > 0); }

    var lines = cartLines();
    var itemsEl = document.getElementById('drawerItems');
    var footEl = document.getElementById('drawerFoot');
    var shipEl = document.getElementById('shipBar');
    if (!itemsEl) return;

    if (!lines.length) {
      itemsEl.innerHTML = '<div class="cart-empty"><p>' + T('cart.empty') + '</p><span class="muted">' + T('cart.emptySub') + '</span><br><br><a class="btn btn--ghost" href="shop.html">' + T('cart.start') + '</a></div>';
      if (footEl) footEl.innerHTML = '';
      if (shipEl) shipEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = lines.map(function (l) {
      var k = l.key;
      var imgHref = l.b ? ('bundles.html#b-' + l.id) : ('product.html?id=' + l.id);
      var meta = l.b
        ? '<span class="line__set">' + T('bundle.set') + '</span>' + (l.items || []).map(function (x) { return x.name + (x.size ? ' (' + x.size + ')' : ''); }).join('、')
        : [l.color, l.size].filter(Boolean).join(' · ');
      return '<div class="line">' +
        '<a class="line__img" href="' + imgHref + '"><img src="' + imgUrl(l.image, 200) + '" alt="' + l.name + '" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'"></a>' +
        '<div><div class="line__name">' + l.name + '</div>' +
        '<div class="line__meta">' + meta + '</div>' +
        '<div class="stepper" data-key="' + k + '"><button data-step="-1" aria-label="' + T('aria.dec') + '">–</button><span>' + l.qty + '</span><button data-step="1" aria-label="' + T('aria.inc') + '">+</button></div></div>' +
        '<div class="line__right"><div class="line__price">' + money(l.price * l.qty) + '</div>' +
        '<button class="line__rm" data-rm="' + k + '">' + T('cart.remove') + '</button></div>' +
      '</div>';
    }).join('');

    var sub = cartSubtotal();
    if (shipEl) {
      var thr = CFG.freeShippingThreshold || 0;
      var pct = thr ? Math.min(100, (sub / thr) * 100) : 100;
      var remain = Math.max(0, thr - sub);
      if (remain > 0) {
        shipEl.className = 'ship-bar';
        shipEl.innerHTML = '<p>' + T('cart.shipRemain', { x: money(remain) }) + '</p>' +
          '<div class="ship-track"><i style="width:' + pct + '%"></i></div>';
      } else {
        shipEl.className = '';
        shipEl.innerHTML = '';
      }
    }
    if (footEl) {
      var checkoutBtn = '<a class="btn btn--block" href="checkout.html">' + T('cart.checkout') + '</a>';
      footEl.innerHTML =
        '<div class="drawer__sub"><span>' + T('cart.subtotal') + '</span><b>' + money(sub) + '</b></div>' +
        '<small>' + T('cart.taxNote') + '</small>' + checkoutBtn;
      loadAutoPromos(function (promos) {
        if (cartSubtotal() !== sub) return;   // cart changed since fetch → skip stale render
        footEl.innerHTML = receiptHTML(sub, cartReceipt(lines, sub, promos)) +
          '<small style="display:block;margin-top:8px">' + T('cart.taxNote') + '</small>' + checkoutBtn;
      });
    }
  }
  window.updateCartUI = updateCartUI;

  /* ---------- mobile menu open/close ---------- */
  function openMobileMenu() {
    var m = document.getElementById('mobileMenu'); if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    var b = document.getElementById('burger'); if (b) b.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    var m = document.getElementById('mobileMenu'); if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    var b = document.getElementById('burger'); if (b) b.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleMobileMenu() {
    var m = document.getElementById('mobileMenu'); if (!m) return;
    if (m.classList.contains('open')) closeMobileMenu(); else openMobileMenu();
  }

  /* ---------- drawer open/close ---------- */
  function openDrawer() {
    document.getElementById('overlay').classList.add('open');
    document.getElementById('drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.getElementById('overlay').classList.remove('open');
    document.getElementById('drawer').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------- inventory helpers ---------- */
  // stock value for a size (+ optional color): uses the "color|size" key when present,
  // else falls back to the legacy size-only key (so existing products keep working).
  function stockVal(p, size, color) {
    var st = p.stock || {};
    var ck = (p.colors && p.colors.length && color) ? (color + '|' + size) : null;
    if (ck && st[ck] != null) return st[ck];
    return st[size];
  }
  window.stockVal = stockVal;
  window.sizeSoldOut = function (p, size, color) {
    if (!p || !p.trackInventory || p.continueSelling) return false;
    var s = stockVal(p, size, color);
    return (s != null) && Number(s) <= 0;
  };
  window.productSoldOut = function (p) {
    if (!p || !p.trackInventory || p.continueSelling) return false;
    var sizes = p.sizes || [];
    if (!sizes.length) return false;
    var colors = (p.colors && p.colors.length) ? p.colors.map(function (c) { return c.name; }) : [null];
    return sizes.every(function (sz) {
      return colors.every(function (cn) { return Number(stockVal(p, sz, cn) || 0) <= 0; });
    });
  };

  /* ---------- cart promo engine (MUST stay in sync with checkout.html computeCartDiscount) ---------- */
  function _dInScope(promo, line) {
    if (promo.scope_type === 'all' || !promo.scope_type) return true;
    var p = window.findProduct ? window.findProduct(line.id) : null; if (!p) return false;
    if (promo.scope_type === 'category') return (promo.scope_ids || []).indexOf(p.category) >= 0;
    if (promo.scope_type === 'product') return (promo.scope_ids || []).indexOf(line.id) >= 0;
    return false;
  }
  function _dUnits(promo, lines) {
    var units = [];
    (lines || []).forEach(function (l) {
      if (l.b) return;
      if (window.findProduct && !window.findProduct(l.id)) return;
      if (!_dInScope(promo, l)) return;
      for (var k = 0; k < (l.qty || 0); k++) units.push({ key: l.key, price: l.price || 0 });
    });
    units.sort(function (a, b) { return a.price - b.price; });
    return units;
  }
  function _mark(res, key, label) { var m = res.perLine[key] || { n: 0, label: label }; m.n++; m.label = label; res.perLine[key] = m; }
  function _pctLabel(off) { return off === 50 ? '半价' : ((Math.round((100 - off) / 10 * 10) / 10) + ' 折'); }
  function computeCartDiscount(promo, lines, subtotal) {
    var cfg = promo.config || {}, units = _dUnits(promo, lines), n = units.length, i;
    var res = { amount: 0, perLine: {}, eligible: n, need: 0 };
    if (promo.type === 'bxgy') {
      var buy = Math.max(1, parseInt(cfg.buy, 10) || 1), get = Math.max(1, parseInt(cfg.get, 10) || 1);
      var fpct = (cfg.free_pct != null && +cfg.free_pct > 0) ? +cfg.free_pct : 100;
      var gsize = buy + get, free = Math.floor(n / gsize) * get;
      var cap = cfg.max_per_order ? parseInt(cfg.max_per_order, 10) : Infinity; if (free > cap) free = cap;
      for (i = 0; i < free; i++) { res.amount += units[i].price * fpct / 100; _mark(res, units[i].key, fpct >= 100 ? '免费' : '赠品价'); }
      res.need = n > 0 ? ((gsize - n % gsize) % gsize) : 0;
    } else if (promo.type === 'nth') {
      var nth = Math.max(2, parseInt(cfg.nth, 10) || 2);
      var opct = (cfg.off_pct != null && +cfg.off_pct > 0) ? +cfg.off_pct : 50;
      var rep = cfg.repeating !== false;
      var g = Math.floor(n / nth); if (!rep) g = Math.min(g, 1);
      var cap2 = cfg.max_per_order ? parseInt(cfg.max_per_order, 10) : Infinity; if (g > cap2) g = cap2;
      for (i = 0; i < g; i++) { res.amount += units[i].price * opct / 100; _mark(res, units[i].key, _pctLabel(opct)); }
      res.need = (!rep && n >= nth) ? 0 : (n > 0 ? ((nth - n % nth) % nth) : 0);
    } else if (promo.type === 'percent') {
      var preq = cfg.req || 'amount', pmin = +cfg.req_min || 0;
      var pord = (cfg.applies_to || 'order') === 'order', pm = cfg.method || 'percent', pv = +promo.value || 0;
      var inSum = 0; for (i = 0; i < n; i++) inSum += units[i].price;
      var met = preq === 'qty' ? (n >= pmin) : (inSum >= pmin);
      if (met) {
        if (pord) {
          res.amount = (pm === 'fixed') ? Math.min(pv, subtotal) : Math.round(subtotal * pv / 100 * 100) / 100;
        } else {
          for (i = 0; i < n; i++) {
            var up = units[i].price, dd = (pm === 'unit_price') ? Math.max(0, up - pv) : (pm === 'fixed') ? Math.min(up, pv) : (up * pv / 100);
            if (dd > 0) { res.amount += dd; _mark(res, units[i].key, pm === 'unit_price' ? ('RM ' + pv) : (pm === 'fixed' ? ('减 ' + pv) : (pv + '% off'))); }
          }
        }
      } else if (preq === 'qty') { res.need = Math.max(0, pmin - n); }
    } else if (promo.type === 'gift') {
      var greq = cfg.req || 'amount', gmin = +cfg.req_min || 0, gsum = 0;
      for (i = 0; i < n; i++) gsum += units[i].price;
      var gmet = greq === 'qty' ? (n >= gmin) : (gsum >= gmin);
      if (gmet && cfg.gift_id) { res.gift = { id: cfg.gift_id, qty: Math.max(1, parseInt(cfg.gift_qty, 10) || 1) }; }
      else { res.need = (greq === 'qty') ? Math.max(0, gmin - n) : 0; res.needAmt = (greq === 'amount') ? Math.max(0, gmin - gsum) : 0; }
    } else if (promo.type === 'addon') {
      var areq = cfg.req || 'amount', amin = +cfg.req_min || 0, asum = 0;
      for (i = 0; i < n; i++) asum += units[i].price;
      var amet = areq === 'qty' ? (n >= amin) : (asum >= amin);
      if (amet && cfg.addon_id) { res.addon = { id: cfg.addon_id, price: +cfg.addon_price || 0, qty: Math.max(1, parseInt(cfg.addon_qty, 10) || 1) }; }
      else { res.need = (areq === 'qty') ? Math.max(0, amin - n) : 0; res.needAmt = (areq === 'amount') ? Math.max(0, amin - asum) : 0; }
    }
    res.amount = Math.round(res.amount * 100) / 100;
    return res;
  }
  window.computeCartDiscount = computeCartDiscount;

  /* ---------- cart drawer promo receipt (auto-apply preview, matches checkout) ---------- */
  var _autoPromos = null;
  function loadAutoPromos(cb) {
    if (_autoPromos) { cb(_autoPromos); return; }
    if (!(window.DB && DB.autoDiscounts)) { _autoPromos = []; cb([]); return; }
    DB.autoDiscounts(999999).then(function (r) { _autoPromos = (r && r.data) || []; cb(_autoPromos); }, function () { _autoPromos = []; cb([]); });
  }
  function cartReceipt(lines, sub, promos) {
    var thr = CFG.freeShippingThreshold || 0, flat = CFG.shippingFlat || 0;
    var baseShip = sub >= thr ? 0 : flat;
    var best = null, freeShipPromo = null, nudge = null, giftName = null;
    (promos || []).filter(function (p) { return sub >= (+p.min_subtotal || 0); }).forEach(function (p) {
      if (p.type === 'gift') { var gr = computeCartDiscount(p, lines, sub); if (gr.gift && !giftName) { var gp = window.findProduct && window.findProduct(gr.gift.id); giftName = (gp ? ((window.LANG === 'zh' && gp.name_zh) ? gp.name_zh : gp.name) : gr.gift.id) + (gr.gift.qty > 1 ? (' ×' + gr.gift.qty) : ''); } return; }
      if (p.type === 'addon') return;
      var cand = null;
      if (p.type === 'bxgy' || p.type === 'nth' || p.type === 'percent') { var res = computeCartDiscount(p, lines, sub); cand = { amount: res.amount, promo: p }; if (res.eligible > 0 && res.need > 0 && (!nudge || res.need < nudge.need)) nudge = { need: res.need, label: p.name || p.code }; }
      else if (p.type === 'fixed') { cand = { amount: Math.max(0, Math.min(sub, +p.value || 0)), promo: p }; }
      else if (p.type === 'free_shipping') { if (baseShip > 0) freeShipPromo = p; return; }
      if (cand && cand.amount > 0 && (!best || cand.amount > best.amount)) best = cand;
    });
    var discount = best ? best.amount : 0;
    var effShip = freeShipPromo ? 0 : baseShip;
    var savedShip = (effShip === 0 && flat > 0) ? flat : 0;
    return { discount: discount, label: best ? (best.promo.name || best.promo.code) : '', effShip: effShip, total: Math.max(0, sub - discount) + effShip, savings: discount + savedShip, nudge: nudge, gift: giftName };
  }
  function receiptHTML(sub, rec) {
    var row = function (a, b, cl) { return '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px"><span>' + a + '</span><span' + (cl ? ' style="' + cl + '"' : '') + '>' + b + '</span></div>'; };
    var h = '<div style="display:flex;justify-content:space-between"><span>' + T('cart.subtotal') + '</span><b>' + money(sub) + '</b></div>';
    if (rec.gift) h += row('🎁 ' + rec.gift, T('cart.giftFree'), 'color:var(--green,#2F7D4F)');
    if (rec.discount > 0) h += row(rec.label, '−' + money(rec.discount), 'color:var(--wine,#82213E)');
    h += row(T('cart.shipping'), rec.effShip === 0 ? ('<b style="color:var(--green,#2F7D4F)">' + T('cart.free') + '</b>') : money(rec.effShip));
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;padding-top:8px;border-top:1px solid var(--line,#ECD9D6)"><span>' + T('cart.estTotal') + '</span><b style="font-family:var(--serif);font-size:20px">' + money(rec.total) + '</b></div>';
    if (rec.savings > 0) h += '<div style="font-size:12.5px;color:var(--green,#2F7D4F);margin-top:3px">' + T('cart.saved', { x: money(rec.savings) }) + '</div>';
    if (rec.nudge && rec.nudge.need > 0) h += '<div style="font-size:12px;margin-top:8px;background:var(--pink-soft,#F6E4E6);color:var(--wine,#82213E);border-radius:6px;padding:8px 10px">' + T('cart.nudge', { n: rec.nudge.need, name: rec.nudge.label }) + '</div>';
    return h;
  }

  /* ---------- product card ---------- */
  function productCard(p) {
    var onSale = p.compareAt && p.compareAt > p.price;
    var soldOut = window.productSoldOut && productSoldOut(p);
    var badge = '';
    if (soldOut) {
      badge = '<span class="card__badge is-out">' + T('badge.soldOut') + '</span>';
    } else if (p.badge) {
      var bl = p.badge.toLowerCase();
      var blabel = bl === 'sale' ? T('badge.sale') : bl === 'new' ? T('badge.new') : p.badge;
      badge = '<span class="card__badge' + (bl === 'sale' ? ' is-sale' : '') + '">' + blabel + '</span>';
    }
    var price = onSale
      ? '<span class="now sale">' + money(p.price) + '</span><span class="was">' + money(p.compareAt) + '</span>'
      : '<span class="now">' + money(p.price) + '</span>';
    var swatches = (p.colors || []).slice(0, 4).map(function (c) {
      return '<span class="sw" style="background:' + c.hex + '" title="' + c.name + '"></span>';
    }).join('');
    var img2 = p.images[1] || p.images[0];
    var nColors = (p.colors || []).length;
    var colourLine = nColors ? (nColors > 1 ? T('card.colours', { n: nColors }) : T('card.colour', { n: nColors })) : '';
    return '<article class="card reveal">' +
      '<div class="card__media">' +
        '<a href="product.html?id=' + p.id + '" aria-label="' + PN(p) + '" style="position:absolute;inset:0;z-index:1"></a>' +
        badge +
        '<img class="main" src="' + imgUrl(p.images[0], 700) + '" alt="' + PN(p) + '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">' +
        '<img class="alt" src="' + imgUrl(img2, 700) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '</div>' +
      '<div class="card__body">' +
        '<div class="card__cat">' + PC(p) + '</div>' +
        '<a href="product.html?id=' + p.id + '"><h3 class="card__name">' + PN(p) + '</h3></a>' +
        '<div class="card__price">' + price + '</div>' +
        '<div class="card__swatches">' + swatches + '</div>' +
        '<div class="card__colours">' + colourLine + '</div>' +
      '</div>' +
    '</article>';
  }
  window.productCard = productCard;
  window.renderProducts = function (list, mountSel) {
    var el = document.querySelector(mountSel);
    if (el) { el.innerHTML = list.map(productCard).join(''); observeReveals(); }
  };

  /* ---------- toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }
  window.toast = toast;

  /* ---------- reveal on scroll ---------- */
  var io;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (e) { e.classList.add('in'); });
      return;
    }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(function (e) { io.observe(e); });
  }
  window.observeReveals = observeReveals;

  /* ---------- wire global events ---------- */
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var quick = t.closest('[data-quick]');
      if (quick) {
        var p = findProduct(quick.getAttribute('data-quick'));
        if (p) addToCart(p.id, (p.sizes && p.sizes[1]) || (p.sizes && p.sizes[0]) || 'One Size',
                          (p.colors && p.colors[0] && p.colors[0].name) || '', 1);
        return;
      }
      if (t.closest('#cartBtn')) { openDrawer(); return; }
      if (t.closest('#drawerClose') || t.id === 'overlay') { closeDrawer(); return; }
      if (t.closest('#burger')) { toggleMobileMenu(); return; }
      if (t.closest('#mmClose')) { closeMobileMenu(); return; }
      if (t.closest('.mm__link')) { closeMobileMenu(); return; }
      if (t.closest('#mmLangBtn')) { if (window.setLang) setLang(window.LANG === 'zh' ? 'en' : 'zh'); return; }
      if (t.closest('#langBtn')) { if (window.setLang) setLang(window.LANG === 'zh' ? 'en' : 'zh'); return; }

      var step = t.closest('[data-step]');
      if (step) { setQty(step.parentElement.getAttribute('data-key'), parseInt(step.getAttribute('data-step'), 10)); return; }
      var rm = t.closest('[data-rm]');
      if (rm) { removeItem(rm.getAttribute('data-rm')); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); closeMobileMenu(); }
    });

    var header = document.getElementById('siteHeader');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 10); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    injectChrome();
    updateCartUI();
    wire();
    observeReveals();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
