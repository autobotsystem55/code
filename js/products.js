/* =====================================================================
   PRODUCT CATALOG  (bilingual: English + 中文)
   ---------------------------------------------------------------------
   To ADD a product, copy one block and change the fields. Required: a
   unique `id`. For Chinese, fill `name_zh` and `description_zh`
   (if left out, the English text is shown in 中文 mode too).

   `images`: Unsplash photo IDs (demo) OR your own — full URLs or local
   paths like "images/my-coat-1.jpg" both work.
   `compareAt` (optional) shows a struck-through "was" price = on sale.
   ===================================================================== */

// Build an Unsplash URL from a photo id, or pass through a real URL/path.
window.imgUrl = function (idOrUrl, w) {
  w = w || 800;
  if (!idOrUrl) return 'images/placeholder.svg';
  if (/^https?:\/\//.test(idOrUrl) || idOrUrl.indexOf('/') !== -1 || /\.(jpg|jpeg|png|webp|svg)$/i.test(idOrUrl)) {
    return idOrUrl; // already a URL or local path
  }
  return 'https://images.unsplash.com/photo-' + idOrUrl + '?auto=format&fit=crop&w=' + w + '&q=80';
};

window.PRODUCTS = [
  {
    id: 'overcoat-01', name: 'Wool-Blend Overcoat', name_zh: '羊毛混纺大衣', category: 'Outerwear',
    price: 248, compareAt: 320, badge: 'Sale',
    images: ['1539109136881-3be0616acf4b', '1490114538077-0a7f8cb49891'],
    colors: [{ name: 'Camel', hex: '#C2A07A' }, { name: 'Charcoal', hex: '#3A3A3A' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'A timeless single-breasted overcoat cut from a soft Italian wool blend. Fully lined, with a relaxed drop shoulder and a length that hits just below the knee.',
    description_zh: '经典单排扣大衣，采用柔软的意大利羊毛混纺面料，全内衬，落肩宽松版型，衣长及膝下，百搭耐看。',
  },
  {
    id: 'cashmere-crew-02', name: 'Cashmere Crewneck Sweater', name_zh: '羊绒圆领毛衣', category: 'Knitwear',
    price: 165, badge: 'New',
    images: ['1576566588028-4147f3842f27', '1467043198406-dc953a3defa0'],
    colors: [{ name: 'Oat', hex: '#D9CDB6' }, { name: 'Slate', hex: '#5A6066' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'Pure grade-A Mongolian cashmere, knitted to a mid-weight gauge that layers all year. Ribbed collar, cuffs and hem hold their shape wash after wash.',
    description_zh: '采用 A 级蒙古羊绒，中等克重，四季可叠穿。罗纹领口、袖口与下摆久洗不变形。',
  },
  {
    id: 'oxford-shirt-03', name: 'Oxford Cotton Shirt', name_zh: '牛津纺棉质衬衫', category: 'Shirts',
    price: 95,
    images: ['1503342217505-b0a15ec3261c', '1620012253295-c15cc3e65df4'],
    colors: [{ name: 'White', hex: '#F4F1EA' }, { name: 'Sky', hex: '#AFC3D6' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'The everyday oxford, refined. Woven from organic long-staple cotton with a button-down collar and a clean, slightly tapered fit.',
    description_zh: '日常牛津衬衫的精致版本，选用有机长绒棉，纽扣领设计，剪裁利落微收身。',
  },
  {
    id: 'wide-trouser-04', name: 'Pleated Wide Trousers', name_zh: '褶裥阔腿裤', category: 'Trousers',
    price: 130, badge: 'New',
    images: ['1542272604-787c3835535d', '1551489186-cf8726f514f8'],
    colors: [{ name: 'Stone', hex: '#B8AD97' }, { name: 'Black', hex: '#26241F' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'High-rise pleated trousers with a fluid, wide leg. Tailored from a crease-resistant blend that moves from desk to dinner without missing a beat.',
    description_zh: '高腰褶裥设计，垂顺阔腿。抗皱混纺面料，从通勤到晚宴都从容得体。',
  },
  {
    id: 'silk-dress-05', name: 'Silk Slip Dress', name_zh: '真丝吊带连衣裙', category: 'Dresses',
    price: 185,
    images: ['1515886657613-9f3515b0c78f', '1490481651871-ab68de25d43d'],
    colors: [{ name: 'Champagne', hex: '#E4D2B8' }, { name: 'Ink', hex: '#2A2C33' }],
    sizes: ['XS', 'S', 'M', 'L'],
    description: 'A bias-cut slip in lustrous sandwashed silk. Adjustable straps and a midi length make it as easy to dress up as it is to throw on with a knit.',
    description_zh: '斜裁吊带裙，采用光泽柔软的砂洗真丝。可调节肩带、中长裙摆，单穿优雅，叠针织也好看。',
  },
  {
    id: 'linen-blazer-06', name: 'Linen Blazer', name_zh: '亚麻西装外套', category: 'Outerwear',
    price: 210,
    images: ['1487222477894-8943e31ef7b2', '1485462537746-965f33f7f6a7'],
    colors: [{ name: 'Sand', hex: '#D7C4A3' }, { name: 'Olive', hex: '#6E6B4E' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'An unstructured blazer in breathable European linen. Soft shoulders and patch pockets give it an easy, lived-in elegance.',
    description_zh: '无衬结构西装外套，选用透气的欧洲亚麻。柔软肩线与贴袋设计，随性中见优雅。',
  },
  {
    id: 'cardigan-07', name: 'Ribbed Knit Cardigan', name_zh: '罗纹针织开衫', category: 'Knitwear',
    price: 145, compareAt: 180, badge: 'Sale',
    images: ['1556905055-8f358a7a47b2', '1496747611176-843222e1e57c'],
    colors: [{ name: 'Cream', hex: '#EDE6D6' }, { name: 'Rust', hex: '#A8503A' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'A chunky ribbed cardigan with corozo buttons and a generous shawl collar. The kind of layer you reach for from the first cool morning onward.',
    description_zh: '粗罗纹开衫，配象牙果纽扣与宽大的青果领。天气一转凉就会想穿的那件外搭。',
  },
  {
    id: 'denim-08', name: 'Relaxed Tapered Denim', name_zh: '微锥型休闲牛仔裤', category: 'Trousers',
    price: 110,
    images: ['1618354691373-d851c5c3a990', '1444069069008-83a57aac43ac'],
    colors: [{ name: 'Indigo', hex: '#3C4A63' }, { name: 'Washed', hex: '#8E9BAE' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'Mid-rise jeans in rigid Japanese denim that breaks in beautifully. Relaxed through the thigh, tapered to a clean ankle.',
    description_zh: '中腰牛仔裤，采用日本硬挺丹宁，越穿越有韵味。大腿宽松，裤脚利落微锥。',
  },
  {
    id: 'cotton-tee-09', name: 'Organic Cotton Tee', name_zh: '有机棉 T 恤', category: 'Tops',
    price: 48,
    images: ['1521572163474-6864f9cf17ab', '1483985988355-763728e1935b'],
    colors: [{ name: 'White', hex: '#F4F1EA' }, { name: 'Black', hex: '#26241F' }, { name: 'Clay', hex: '#A8503A' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'A heavyweight tee with a structured neckline that holds its shape. Cut from GOTS-certified organic cotton for an honest, substantial feel.',
    description_zh: '厚磅 T 恤，挺括领口不易变形。采用 GOTS 认证有机棉，手感扎实诚实。',
  },
  {
    id: 'turtleneck-10', name: 'Merino Turtleneck', name_zh: '美利奴高领衫', category: 'Knitwear',
    price: 120,
    images: ['1521577352947-9bb58764b69a', '1469334031218-e382a71b716b'],
    colors: [{ name: 'Bone', hex: '#E0D8C7' }, { name: 'Bordeaux', hex: '#6E2C2C' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'Fine-gauge extra-fine merino that layers invisibly under a coat yet stands on its own. Naturally temperature-regulating and itch-free.',
    description_zh: '细针超细美利奴羊毛，藏于大衣内不臃肿，单穿也好看。天然调温，亲肤不扎。',
  },
  {
    id: 'trench-11', name: 'Tailored Trench Coat', name_zh: '修身风衣', category: 'Outerwear',
    price: 295, badge: 'New',
    images: ['1591047139829-d91aecb6caea', '1539008835657-9e8e9680c956'],
    colors: [{ name: 'Khaki', hex: '#B5A582' }, { name: 'Black', hex: '#26241F' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    description: 'A water-repellent cotton-gabardine trench with all the heritage details — storm flap, belted waist and horn buttons — in a modern, lighter cut.',
    description_zh: '防泼水棉华达呢风衣，保留所有经典细节——防风盖、束腰腰带与牛角扣，剪裁更现代轻盈。',
  },
  {
    id: 'tote-12', name: 'Structured Leather Tote', name_zh: '真皮托特包', category: 'Accessories',
    price: 195,
    images: ['1524758631624-e2822e304c36', '1604176354204-9268737828e4'],
    colors: [{ name: 'Tan', hex: '#B07B4F' }, { name: 'Black', hex: '#26241F' }],
    sizes: ['One Size'],
    description: 'A roomy vegetable-tanned leather tote that softens with age. Fits a 15" laptop, with an interior zip pocket to keep the small things found.',
    description_zh: '大容量植鞣皮托特包，越用越柔软。可放 15 寸笔记本，内置拉链袋收纳零碎物品。',
  },
];

// Categories used by the shop filter (codes; labels are localized in js/i18n.js).
window.CATEGORIES = ['All', 'Outerwear', 'Knitwear', 'Shirts', 'Tops', 'Trousers', 'Dresses', 'Accessories'];

window.findProduct = function (id) {
  return (window.PRODUCTS || []).find(function (p) { return p.id === id; }) || null;
};
