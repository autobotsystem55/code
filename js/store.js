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
  function keyOf(it) { return it.id + '|' + (it.size || '') + '|' + (it.color || ''); }
  function cartCount() { return getCart().reduce(function (n, i) { return n + i.qty; }, 0); }
  function cartSubtotal() {
    return getCart().reduce(function (s, i) {
      var p = findProduct(i.id); return p ? s + p.price * i.qty : s;
    }, 0);
  }
  // detailed lines (product joined) for pixel + summaries
  function cartLines() {
    return getCart().map(function (i) {
      var p = findProduct(i.id) || {};
      return { id: i.id, name: p.id ? PN(p) : i.id, price: p.price || 0, qty: i.qty, size: i.size, color: i.color, image: (p.images || [])[0] };
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
  window.Store = { addToCart: addToCart, getCart: getCart, money: money };

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
    // small superscript flourish for flavour (matches the sweet ✿ motif)
    return b + ' <sup>✿</sup>';
  }

  // Called after DB settings load — refresh the brand wordmark + cart (currency)
  // so admin Settings changes show without a hard reload.
  window.applySettingsToChrome = function () {
    document.querySelectorAll('.brand').forEach(function (el) { el.innerHTML = brandMarkup(); });
    if (window.updateCartUI) updateCartUI();
  };

  /* ---------- header / footer / drawer injection ---------- */
  function injectChrome() {
    var path = location.pathname.split('/').pop() || 'index.html';

    var navHtml = NAV.map(function (n) {
      var active = (n.href.split('?')[0] === path) ? ' class="is-active"' : '';
      return '<a href="' + n.href + '"' + active + '>' + T(n.key) + '</a>';
    }).join('');

    var header = document.getElementById('site-header');
    if (header) {
      header.outerHTML =
        '<div class="announce"><div class="announce__track">' +
          repeatSpans([T('ann.shipping', { x: money(CFG.freeShippingThreshold) }),
                       T('ann.newSeason'), T('ann.returns'), T('ann.lasts')], 2) +
        '</div></div>' +
        '<header class="header" id="siteHeader"><div class="wrap header__inner">' +
          '<nav class="nav">' + navHtml + '</nav>' +
          '<button class="icon-btn burger" id="burger" aria-label="' + T('aria.menu') + '">' + ICON.menu + '</button>' +
          '<a class="brand" href="index.html">' + brandMarkup() + '</a>' +
          '<div class="header__actions">' +
            '<button class="lang-btn" id="langBtn" aria-label="Language">' + T('lang.toggle') + '</button>' +
            '<a class="icon-btn" href="shop.html" aria-label="' + T('aria.search') + '">' + ICON.search + '</a>' +
            '<a class="icon-btn" href="account.html" aria-label="' + T('aria.account') + '">' + ICON.user + '</a>' +
            '<button class="icon-btn" id="cartBtn" aria-label="' + T('aria.cart') + '">' + ICON.cart +
              '<span class="cart-count" id="cartCount">0</span></button>' +
          '</div>' +
        '</div></header>' +
        '<div class="mobile-menu" id="mobileMenu">' + navHtml +
          '<a href="index.html">' + T('nav.home') + '</a>' +
          '<a href="account.html">' + T('acc.title') + '</a></div>';
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
              '<li><a href="shop.html?category=Outerwear">' + T('nav.outerwear') + '</a></li>' +
              '<li><a href="shop.html?category=Knitwear">' + T('nav.knitwear') + '</a></li>' +
              '<li><a href="shop.html?category=Accessories">' + T('foot.accessories') + '</a></li></ul></div>' +
            '<div><h4>' + T('foot.help') + '</h4><ul>' +
              '<li><a href="policies.html#shipping">' + T('foot.shipReturns') + '</a></li>' +
              '<li><a href="#">' + T('foot.size') + '</a></li>' +
              '<li><a href="#">' + T('foot.care') + '</a></li>' +
              '<li><a href="mailto:' + (CFG.email || '') + '">' + T('foot.contact') + '</a></li></ul></div>' +
            '<div><h4>' + T('foot.studio') + '</h4><ul>' +
              '<li><a href="#">' + T('foot.story') + '</a></li>' +
              '<li><a href="#">' + T('foot.sustain') + '</a></li>' +
              '<li><a href="#">' + T('foot.journal') + '</a></li>' +
              '<li><a href="#">' + T('foot.ig') + '</a></li></ul></div>' +
          '</div>' +
          '<div class="footer__bottom"><small>' + T('foot.rights', { y: thisYear(), brand: (CFG.brand || '') }) + '</small>' +
            '<nav style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px">' +
              '<a href="policies.html#privacy">' + T('foot.privacy') + '</a>' +
              '<a href="policies.html#returns">' + T('foot.returns') + '</a>' +
              '<a href="policies.html#shipping">' + T('foot.shippingP') + '</a>' +
              '<a href="policies.html#terms">' + T('foot.terms') + '</a>' +
            '</nav>' +
            '<div class="pay"><span>Visa</span><span>Master</span><span>Amex</span><span>PayPal</span><span>Apple Pay</span></div>' +
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
      var k = l.id + '|' + (l.size || '') + '|' + (l.color || '');
      return '<div class="line">' +
        '<a class="line__img" href="product.html?id=' + l.id + '"><img src="' + imgUrl(l.image, 200) + '" alt="' + l.name + '" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'"></a>' +
        '<div><div class="line__name">' + l.name + '</div>' +
        '<div class="line__meta">' + [l.color, l.size].filter(Boolean).join(' · ') + '</div>' +
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
      shipEl.className = 'ship-bar';
      shipEl.innerHTML = (remain > 0
        ? '<p>' + T('cart.shipRemain', { x: money(remain) }) + '</p>'
        : '<p>' + T('cart.shipUnlocked') + '</p>') +
        '<div class="ship-track"><i style="width:' + pct + '%"></i></div>';
    }
    if (footEl) {
      footEl.innerHTML =
        '<div class="drawer__sub"><span>' + T('cart.subtotal') + '</span><b>' + money(sub) + '</b></div>' +
        '<small>' + T('cart.taxNote') + '</small>' +
        '<a class="btn btn--block" href="checkout.html">' + T('cart.checkout') + '</a>';
    }
  }
  window.updateCartUI = updateCartUI;

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

  /* ---------- product card ---------- */
  function productCard(p) {
    var onSale = p.compareAt && p.compareAt > p.price;
    var badge = '';
    if (p.badge) {
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
      if (t.closest('#burger')) { document.getElementById('mobileMenu').classList.toggle('open'); return; }
      if (t.closest('#langBtn')) { if (window.setLang) setLang(window.LANG === 'zh' ? 'en' : 'zh'); return; }

      var step = t.closest('[data-step]');
      if (step) { setQty(step.parentElement.getAttribute('data-key'), parseInt(step.getAttribute('data-step'), 10)); return; }
      var rm = t.closest('[data-rm]');
      if (rm) { removeItem(rm.getAttribute('data-rm')); return; }
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

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
