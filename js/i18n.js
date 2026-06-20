/* =====================================================================
   I18N — English / 中文 language switch
   ---------------------------------------------------------------------
   • UI strings live in DICT below (en + zh).
   • Static HTML uses data-i18n / data-i18n-html / data-i18n-ph / data-i18n-aria.
   • Product names/descriptions are bilingual in js/products.js
     (name + name_zh, description + description_zh).
   • Language is remembered in localStorage; toggling reloads the page.
   ===================================================================== */
(function () {
  var CFG = window.STORE_CONFIG || {};

  var DICT = {
    en: {
      'lang.toggle': '中文',
      'title.home': 'Code Official — Sweet, Feminine Everyday Wear',
      'title.shop': 'Shop All — Code Official',
      'badge.sale': 'Sale', 'badge.new': 'New', 'card.quick': 'Quick add',
      'card.choose': 'Choose options', 'card.colours': '{n} colours', 'card.colour': '{n} colour',
      // announce
      'ann.shipping': 'Complimentary shipping over {x}',
      'ann.newSeason': 'New arrivals every Friday',
      'ann.returns': 'Easy 30-day returns',
      'ann.lasts': 'Crafted to last',
      // nav
      'nav.shopAll': 'Shop All', 'nav.outerwear': 'Outerwear',
      'nav.knitwear': 'Knitwear', 'nav.dresses': 'Dresses', 'nav.home': 'Home',
      // header aria
      'aria.menu': 'Menu', 'aria.search': 'Search', 'aria.cart': 'Cart',
      'aria.dec': 'Decrease quantity', 'aria.inc': 'Increase quantity', 'aria.thumb': 'View image {n}',
      'aria.account': 'Account',
      // account / auth
      'acc.title': 'My Account', 'acc.lead': 'Sign in to track your orders and check out faster.',
      'acc.signInTitle': 'Sign in', 'acc.signUpTitle': 'Create account',
      'acc.email': 'Email', 'acc.password': 'Password', 'acc.name': 'Full name',
      'acc.signIn': 'Sign in', 'acc.signUp': 'Create account', 'acc.signOut': 'Sign out',
      'acc.noAccount': 'New here?', 'acc.toSignUp': 'Create an account',
      'acc.haveAccount': 'Already have an account?', 'acc.toSignIn': 'Sign in',
      'acc.welcome': 'Welcome back', 'acc.signedInAs': 'Signed in as {x}',
      'acc.myOrders': 'My orders', 'acc.noOrders': 'No orders yet.', 'acc.orderNo': 'Order',
      'acc.created': 'Account created! You can sign in now.',
      'acc.regOk': 'Registration successful!', 'acc.regOkSub': 'Welcome — your account is ready.',
      'acc.regConfirm': 'Please check your email to confirm, then sign in.', 'acc.goHome': 'Go to homepage',
      'acc.err': 'Something went wrong — please check your details and try again.',
      'acc.disabled': 'Member accounts are not enabled yet.',
      // hero
      'hero.season': 'New In · Spring 2026',
      'hero.title': 'Soft, sweet,<br><em>effortlessly</em> you.',
      'hero.lede': 'Feminine everyday pieces in blush pinks and soft creams — made to make you smile.',
      'hero.cta': 'Shop the collection',
      'hero.newOuter': 'New dresses →',
      'hero.tag': '<b>New in</b> · The Silk Slip Dress',
      'hero.est': 'Est. 2026 — Code Official',
      // values
      'val.shipping': 'Free shipping over {x}', 'val.shippingShort': 'Complimentary shipping',
      'val.returns': '30-day easy returns',
      'val.sourced': 'Responsibly sourced', 'val.lasts': 'Made to last',
      // categories section
      'sec.browse': 'Browse', 'sec.shopByCat': 'Shop by category',
      'sec.catIntro': 'Three sweet starting points for your wardrobe.',
      'cat.layer': 'The layer', 'cat.comfort': 'The comfort', 'cat.occasion': 'The occasion',
      // new arrivals
      'sec.newNum': 'Chapter 01 · Just In', 'sec.new': 'New arrivals', 'sec.viewAll': 'View all',
      // editorial
      'ed.eyebrow': 'Our story', 'ed.title': 'Sweetness, in every detail.',
      'ed.p1': 'We design in small, loving batches — soft fabrics, pretty details and colours that feel like a treat. New pieces land every Friday.',
      'ed.p2': 'Every order arrives wrapped with a little extra care.',
      'ed.link': 'Discover the collection →',
      // knit edit
      'sec.knitNum': 'Chapter 02 · Soft Knits', 'sec.knit': 'The knitwear edit',
      // newsletter
      'news.eyebrow': 'Stay in the loop', 'news.title': '10% off your first order',
      'news.p': 'Join the list for early access to new drops, restocks and members-only offers.',
      'news.ph': 'Email address', 'news.btn': 'Subscribe →',
      'news.note': 'No spam. Unsubscribe anytime.', 'news.thanks': 'Thanks — check your inbox',
      // footer
      'foot.tagline': 'Sweet, feminine everyday pieces — new arrivals every Friday.',
      'foot.shop': 'Shop', 'foot.all': 'All products', 'foot.accessories': 'Accessories',
      'foot.help': 'Help', 'foot.shipReturns': 'Shipping & returns', 'foot.size': 'Size guide',
      'foot.care': 'Care', 'foot.contact': 'Contact',
      'foot.privacy': 'Privacy', 'foot.returns': 'Returns', 'foot.shippingP': 'Shipping', 'foot.terms': 'Terms',
      'foot.studio': 'Studio', 'foot.story': 'Our story', 'foot.sustain': 'Sustainability',
      'foot.journal': 'Journal', 'foot.ig': 'Instagram',
      'foot.rights': '© {y} {brand}. All rights reserved.',
      // drawer
      'cart.title': 'Your Bag', 'cart.close': 'Close ✕',
      'cart.shipRemain': 'You’re <b>{x}</b> away from free shipping',
      'cart.shipUnlocked': '<b>✓ You’ve unlocked free shipping</b>',
      'cart.subtotal': 'Subtotal', 'cart.taxNote': 'Shipping & taxes calculated at checkout.',
      'cart.checkout': 'Checkout', 'cart.empty': 'Your bag is empty',
      'cart.emptySub': 'Let’s change that.', 'cart.start': 'Start shopping', 'cart.remove': 'Remove',
      'cart.added': '{x} added',
      // shop
      'shop.collection': 'The collection', 'shop.title': 'Shop All',
      'shop.intro': 'Sweet, feminine pieces you’ll reach for daily.', 'shop.sort': 'Sort',
      'sort.featured': 'Featured', 'sort.priceAsc': 'Price: low to high',
      'sort.priceDesc': 'Price: high to low', 'sort.name': 'Alphabetical',
      'shop.style': 'style', 'shop.styles': 'styles',
      // pdp
      'pdp.sizeGuide': 'Size guide',
      'pdp.sizeGuideMsg': 'XS 0-2 · S 4-6 · M 8-10 · L 12-14 · XL 16-18',
      'pdp.colour': 'Colour', 'pdp.size': 'Size', 'pdp.addToBag': 'Add to bag — {x}',
      'pdp.selectSize': 'Please select a size',
      'pdp.details': 'Details & fit',
      'pdp.detailsBody': 'True to size with a relaxed fit. Model is 5\'9" wearing size S. Composition and full measurements available on request.',
      'pdp.shipping': 'Shipping & returns',
      'pdp.shippingBody': 'Free standard shipping over {x}. Dispatched within 1–2 business days. 30-day free returns on unworn items.',
      'pdp.care': 'Care',
      'pdp.careBody': 'Cool gentle wash or dry clean. Reshape and dry flat away from direct heat to keep fibres at their best.',
      'pdp.also': 'You may also like', 'pdp.complete': 'Complete the look',
      'pdp.notFound': 'Piece not found',
      'pdp.notFoundSub': 'This item may have sold out or moved.', 'pdp.back': 'Back to shop',
      // checkout
      'co.almost': 'Almost yours', 'co.title': 'Checkout',
      'co.contact': 'Contact', 'co.email': 'Email',
      'co.shipping': 'Shipping address', 'co.first': 'First name', 'co.last': 'Last name',
      'co.address': 'Address', 'co.apt': 'Apartment, suite (optional)',
      'co.city': 'City', 'co.zip': 'Postal code', 'co.country': 'Country / region',
      'co.select': 'Select…', 'co.phone': 'Phone',
      'co.payment': 'Payment', 'co.demo': 'Demo — not charged',
      'co.card': 'Card number', 'co.exp': 'Expiry (MM/YY)', 'co.cvc': 'CVC',
      'co.place': 'Place order — {x}', 'co.proceed': 'Proceed to payment — {x}',
      'co.secureDemo': 'This is a demo store — no real payment is processed.',
      'co.secureReal': 'Secure payment. You’ll be redirected to complete your order.',
      'co.summary': 'Order summary', 'co.subtotal': 'Subtotal', 'co.shippingLbl': 'Shipping',
      'co.free': 'Free', 'co.total': 'Total', 'co.fill': 'Please complete the highlighted fields',
      'co.discount': 'Discount', 'co.discPh': 'Discount code', 'co.apply': 'Apply',
      'co.discOk': '−{x} applied', 'co.discBad': 'Invalid or expired code', 'co.discNa': 'Discounts unavailable right now',
      'co.empty': 'Your bag is empty.', 'co.continue': 'Continue shopping',
      // success
      'ok.confirmed': 'Order confirmed', 'ok.thanks': 'Thank you.',
      'ok.line': 'Your order is in — a confirmation is on its way to <b>{x}</b>.',
      'ok.order': 'Order number', 'ok.total': 'Total',
      'ok.tracking': 'We’ll email you tracking as soon as it ships (1–2 business days).',
      'ok.continue': 'Continue shopping', 'ok.none': 'No recent order found.',
      'ok.thanksPlain': 'Thank you',
    },

    zh: {
      'lang.toggle': 'EN',
      'title.home': 'Code Official — 甜美女装 · 日常穿搭',
      'title.shop': '全部商品 — Code Official',
      'badge.sale': '特惠', 'badge.new': '新品', 'card.quick': '快速加入',
      'card.choose': '选择规格', 'card.colours': '{n} 个颜色', 'card.colour': '{n} 个颜色',
      'ann.shipping': '满 {x} 免运费',
      'ann.newSeason': '每周五准时上新',
      'ann.returns': '30 天轻松退换',
      'ann.lasts': '经久耐穿',
      'nav.shopAll': '全部商品', 'nav.outerwear': '外套',
      'nav.knitwear': '针织', 'nav.dresses': '连衣裙', 'nav.home': '首页',
      'aria.menu': '菜单', 'aria.search': '搜索', 'aria.cart': '购物袋',
      'aria.dec': '减少数量', 'aria.inc': '增加数量', 'aria.thumb': '查看图片 {n}',
      'aria.account': '账户',
      // account / auth
      'acc.title': '我的账户', 'acc.lead': '登录后可查看订单、结账更快。',
      'acc.signInTitle': '登录', 'acc.signUpTitle': '注册',
      'acc.email': '邮箱', 'acc.password': '密码', 'acc.name': '姓名',
      'acc.signIn': '登录', 'acc.signUp': '注册', 'acc.signOut': '退出登录',
      'acc.noAccount': '第一次来？', 'acc.toSignUp': '注册一个',
      'acc.haveAccount': '已有账户？', 'acc.toSignIn': '去登录',
      'acc.welcome': '欢迎回来', 'acc.signedInAs': '已登录：{x}',
      'acc.myOrders': '我的订单', 'acc.noOrders': '还没有订单。', 'acc.orderNo': '订单',
      'acc.created': '注册成功！现在可以登录了。',
      'acc.regOk': '注册成功！', 'acc.regOkSub': '欢迎加入，账号已创建。',
      'acc.regConfirm': '请查收邮箱完成验证后再登录。', 'acc.goHome': '前往首页',
      'acc.err': '出错了——请检查信息后重试。',
      'acc.disabled': '会员功能尚未启用。',
      'hero.season': '新品 · 2026 春季',
      'hero.title': '柔软甜美，<br><em>毫不费力</em>的你。',
      'hero.lede': '甜美女性化的日常单品，粉樱与奶油色调，让你会心一笑。',
      'hero.cta': '选购系列',
      'hero.newOuter': '新款连衣裙 →',
      'hero.tag': '<b>新品</b> · 真丝吊带裙',
      'hero.est': '创立于 2026 — Code Official',
      'val.shipping': '满 {x} 免运费', 'val.shippingShort': '全场免运费',
      'val.returns': '30 天轻松退换',
      'val.sourced': '负责任采购', 'val.lasts': '经久耐穿',
      'sec.browse': '浏览', 'sec.shopByCat': '按品类选购',
      'sec.catIntro': '为你的衣橱挑一个甜美起点。',
      'cat.layer': '叠穿层', 'cat.comfort': '舒适感', 'cat.occasion': '场合装',
      'sec.newNum': '第一章 · 新到', 'sec.new': '新品上架', 'sec.viewAll': '查看全部',
      'ed.eyebrow': '品牌故事', 'ed.title': '甜在每个细节。',
      'ed.p1': '我们用心小批量制作——柔软的面料、甜美的细节、像甜点般讨喜的色彩。每周五都有新品上架。',
      'ed.p2': '每一份订单都包裹着一点点额外的用心。',
      'ed.link': '探索完整系列 →',
      'sec.knitNum': '第二章 · 柔软针织', 'sec.knit': '针织精选',
      'news.eyebrow': '保持联系', 'news.title': '首单立减 10%',
      'news.p': '加入会员，抢先获取新品、补货与会员专属优惠。',
      'news.ph': '电子邮箱', 'news.btn': '订阅 →',
      'news.note': '绝无垃圾邮件，可随时退订。', 'news.thanks': '感谢订阅——请查收邮箱',
      'foot.tagline': '甜美女性化日常单品——每周五准时上新。',
      'foot.shop': '选购', 'foot.all': '全部商品', 'foot.accessories': '配饰',
      'foot.help': '帮助', 'foot.shipReturns': '配送与退换', 'foot.size': '尺码指南',
      'foot.care': '保养', 'foot.contact': '联系我们',
      'foot.privacy': '隐私政策', 'foot.returns': '退换货', 'foot.shippingP': '配送', 'foot.terms': '条款',
      'foot.studio': '关于', 'foot.story': '品牌故事', 'foot.sustain': '可持续',
      'foot.journal': '日志', 'foot.ig': 'Instagram',
      'foot.rights': '© {y} {brand} 版权所有。',
      'cart.title': '购物袋', 'cart.close': '关闭 ✕',
      'cart.shipRemain': '再买 <b>{x}</b> 即可免运费',
      'cart.shipUnlocked': '<b>✓ 已享免运费</b>',
      'cart.subtotal': '小计', 'cart.taxNote': '运费与税费将在结账时计算。',
      'cart.checkout': '去结账', 'cart.empty': '购物袋是空的',
      'cart.emptySub': '一起来挑几件吧。', 'cart.start': '开始选购', 'cart.remove': '移除',
      'cart.added': '已加入：{x}',
      'shop.collection': '完整系列', 'shop.title': '全部商品',
      'shop.intro': '甜美女性化单品，日日都想穿。', 'shop.sort': '排序',
      'sort.featured': '推荐', 'sort.priceAsc': '价格：由低到高',
      'sort.priceDesc': '价格：由高到低', 'sort.name': '按名称',
      'shop.style': '款', 'shop.styles': '款',
      'pdp.sizeGuide': '尺码指南',
      'pdp.sizeGuideMsg': 'XS 0-2 · S 4-6 · M 8-10 · L 12-14 · XL 16-18',
      'pdp.colour': '颜色', 'pdp.size': '尺码', 'pdp.addToBag': '加入购物袋 — {x}',
      'pdp.selectSize': '请选择尺码',
      'pdp.details': '细节与版型',
      'pdp.detailsBody': '正常尺码，宽松版型。模特身高 175cm，穿着 S 码。成分与详细尺寸可咨询。',
      'pdp.shipping': '配送与退换',
      'pdp.shippingBody': '满 {x} 免标准运费，1–2 个工作日内发货，未穿着商品 30 天免费退换。',
      'pdp.care': '保养',
      'pdp.careBody': '冷水温和洗涤或干洗。整理后平铺阴干，避免阳光直射，以保持纤维状态。',
      'pdp.also': '你可能也喜欢', 'pdp.complete': '搭配一套',
      'pdp.notFound': '未找到该商品',
      'pdp.notFoundSub': '该商品可能已售罄或下架。', 'pdp.back': '返回商店',
      'co.almost': '即将到手', 'co.title': '结账',
      'co.contact': '联系方式', 'co.email': '邮箱',
      'co.shipping': '收货地址', 'co.first': '名', 'co.last': '姓',
      'co.address': '详细地址', 'co.apt': '门牌 / 单元（选填）',
      'co.city': '城市', 'co.zip': '邮编', 'co.country': '国家 / 地区',
      'co.select': '请选择…', 'co.phone': '电话',
      'co.payment': '支付', 'co.demo': '演示 — 不会扣款',
      'co.card': '卡号', 'co.exp': '有效期（月/年）', 'co.cvc': '安全码',
      'co.place': '提交订单 — {x}', 'co.proceed': '前往支付 — {x}',
      'co.secureDemo': '这是演示商店——不会产生真实扣款。',
      'co.secureReal': '安全支付，将跳转至收银台完成订单。',
      'co.summary': '订单摘要', 'co.subtotal': '小计', 'co.shippingLbl': '运费',
      'co.free': '免费', 'co.total': '合计', 'co.fill': '请填写高亮的必填项',
      'co.discount': '优惠', 'co.discPh': '优惠码', 'co.apply': '应用',
      'co.discOk': '已减 {x}', 'co.discBad': '优惠码无效或已过期', 'co.discNa': '暂不可用优惠码',
      'co.empty': '购物袋是空的。', 'co.continue': '继续选购',
      'ok.confirmed': '订单已确认', 'ok.thanks': '感谢你的购买。',
      'ok.line': '订单已提交——确认邮件正发往 <b>{x}</b>。',
      'ok.order': '订单号', 'ok.total': '合计',
      'ok.tracking': '发货后我们会立即邮件通知物流（1–2 个工作日）。',
      'ok.continue': '继续选购', 'ok.none': '未找到最近的订单。',
      'ok.thanksPlain': '感谢',
    },
  };

  // category code -> localized label
  var CAT = {
    en: { All: 'All', Outerwear: 'Outerwear', Knitwear: 'Knitwear', Shirts: 'Shirts', Tops: 'Tops', Trousers: 'Trousers', Dresses: 'Dresses', Accessories: 'Accessories' },
    zh: { All: '全部', Outerwear: '外套', Knitwear: '针织', Shirts: '衬衫', Tops: '上衣', Trousers: '裤装', Dresses: '连衣裙', Accessories: '配饰' },
  };

  // resolve current language
  var stored = null;
  try { stored = localStorage.getItem('eclat_lang'); } catch (e) {}
  var auto = (navigator.language || 'en').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  var LANG = stored || CFG.defaultLang || auto;
  if (!DICT[LANG]) LANG = 'en';
  window.LANG = LANG;

  function fill(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) { return (k in vars) ? vars[k] : m; });
  }
  window.t = function (key, vars) {
    var s = (DICT[LANG] && DICT[LANG][key]) || DICT.en[key] || key;
    return fill(s, vars);
  };
  window.tCat = function (code) { return (CAT[LANG] && CAT[LANG][code]) || code; };

  // localized product fields (fall back to English source)
  window.pName = function (p) { return (LANG === 'zh' && p.name_zh) ? p.name_zh : p.name; };
  window.pDesc = function (p) { return (LANG === 'zh' && p.description_zh) ? p.description_zh : p.description; };
  window.pCat = function (p) { return window.tCat(p.category); };

  window.setLang = function (l) {
    try { localStorage.setItem('eclat_lang', l); } catch (e) {}
    location.reload();
  };

  // apply translations to static HTML
  window.applyI18n = function (root) {
    root = root || document;
    document.documentElement.lang = (LANG === 'zh') ? 'zh-Hans' : 'en';
    root.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = window.t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = window.t(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = window.t(el.getAttribute('data-i18n-ph')); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', window.t(el.getAttribute('data-i18n-aria'))); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.applyI18n(); });
  else window.applyI18n();
})();
