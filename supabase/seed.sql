-- ============================================================
--  PÉTALE — 导入示例商品（12 件）
--  用法：先跑过 schema.sql，再把本文件粘进 Supabase → SQL Editor → Run。
--  可重复运行：同 id 的商品会被更新（不会重复）。
-- ============================================================
insert into public.products
  (id, name, name_zh, category, price, compare_at, badge, description, description_zh, sizes, colors, images, sort)
values
('overcoat-01','Wool-Blend Overcoat','羊毛混纺大衣','Outerwear',248,320,'Sale',
 'A timeless single-breasted overcoat cut from a soft Italian wool blend. Fully lined, with a relaxed drop shoulder and a length that hits just below the knee.',
 '经典单排扣大衣，采用柔软的意大利羊毛混纺面料，全内衬，落肩宽松版型，衣长及膝下，百搭耐看。',
 '["XS","S","M","L","XL"]','[{"name":"Camel","hex":"#C2A07A"},{"name":"Charcoal","hex":"#3A3A3A"}]',
 '["1539109136881-3be0616acf4b","1490114538077-0a7f8cb49891"]',1),

('cashmere-crew-02','Cashmere Crewneck Sweater','羊绒圆领毛衣','Knitwear',165,null,'New',
 'Pure grade-A Mongolian cashmere, knitted to a mid-weight gauge that layers all year. Ribbed collar, cuffs and hem hold their shape wash after wash.',
 '采用 A 级蒙古羊绒，中等克重，四季可叠穿。罗纹领口、袖口与下摆久洗不变形。',
 '["XS","S","M","L","XL"]','[{"name":"Oat","hex":"#D9CDB6"},{"name":"Slate","hex":"#5A6066"}]',
 '["1576566588028-4147f3842f27","1467043198406-dc953a3defa0"]',2),

('oxford-shirt-03','Oxford Cotton Shirt','牛津纺棉质衬衫','Shirts',95,null,null,
 'The everyday oxford, refined. Woven from organic long-staple cotton with a button-down collar and a clean, slightly tapered fit.',
 '日常牛津衬衫的精致版本，选用有机长绒棉，纽扣领设计，剪裁利落微收身。',
 '["XS","S","M","L","XL"]','[{"name":"White","hex":"#F4F1EA"},{"name":"Sky","hex":"#AFC3D6"}]',
 '["1503342217505-b0a15ec3261c","1620012253295-c15cc3e65df4"]',3),

('wide-trouser-04','Pleated Wide Trousers','褶裥阔腿裤','Trousers',130,null,'New',
 'High-rise pleated trousers with a fluid, wide leg. Tailored from a crease-resistant blend that moves from desk to dinner without missing a beat.',
 '高腰褶裥设计，垂顺阔腿。抗皱混纺面料，从通勤到晚宴都从容得体。',
 '["XS","S","M","L","XL"]','[{"name":"Stone","hex":"#B8AD97"},{"name":"Black","hex":"#26241F"}]',
 '["1542272604-787c3835535d","1551489186-cf8726f514f8"]',4),

('silk-dress-05','Silk Slip Dress','真丝吊带连衣裙','Dresses',185,null,null,
 'A bias-cut slip in lustrous sandwashed silk. Adjustable straps and a midi length make it as easy to dress up as it is to throw on with a knit.',
 '斜裁吊带裙，采用光泽柔软的砂洗真丝。可调节肩带、中长裙摆，单穿优雅，叠针织也好看。',
 '["XS","S","M","L"]','[{"name":"Champagne","hex":"#E4D2B8"},{"name":"Ink","hex":"#2A2C33"}]',
 '["1515886657613-9f3515b0c78f","1490481651871-ab68de25d43d"]',5),

('linen-blazer-06','Linen Blazer','亚麻西装外套','Outerwear',210,null,null,
 'An unstructured blazer in breathable European linen. Soft shoulders and patch pockets give it an easy, lived-in elegance.',
 '无衬结构西装外套，选用透气的欧洲亚麻。柔软肩线与贴袋设计，随性中见优雅。',
 '["XS","S","M","L","XL"]','[{"name":"Sand","hex":"#D7C4A3"},{"name":"Olive","hex":"#6E6B4E"}]',
 '["1487222477894-8943e31ef7b2","1485462537746-965f33f7f6a7"]',6),

('cardigan-07','Ribbed Knit Cardigan','罗纹针织开衫','Knitwear',145,180,'Sale',
 'A chunky ribbed cardigan with corozo buttons and a generous shawl collar. The kind of layer you reach for from the first cool morning onward.',
 '粗罗纹开衫，配象牙果纽扣与宽大的青果领。天气一转凉就会想穿的那件外搭。',
 '["XS","S","M","L","XL"]','[{"name":"Cream","hex":"#EDE6D6"},{"name":"Rust","hex":"#A8503A"}]',
 '["1556905055-8f358a7a47b2","1496747611176-843222e1e57c"]',7),

('denim-08','Relaxed Tapered Denim','微锥型休闲牛仔裤','Trousers',110,null,null,
 'Mid-rise jeans in rigid Japanese denim that breaks in beautifully. Relaxed through the thigh, tapered to a clean ankle.',
 '中腰牛仔裤，采用日本硬挺丹宁，越穿越有韵味。大腿宽松，裤脚利落微锥。',
 '["XS","S","M","L","XL"]','[{"name":"Indigo","hex":"#3C4A63"},{"name":"Washed","hex":"#8E9BAE"}]',
 '["1618354691373-d851c5c3a990","1444069069008-83a57aac43ac"]',8),

('cotton-tee-09','Organic Cotton Tee','有机棉 T 恤','Tops',48,null,null,
 'A heavyweight tee with a structured neckline that holds its shape. Cut from GOTS-certified organic cotton for an honest, substantial feel.',
 '厚磅 T 恤，挺括领口不易变形。采用 GOTS 认证有机棉，手感扎实诚实。',
 '["XS","S","M","L","XL"]','[{"name":"White","hex":"#F4F1EA"},{"name":"Black","hex":"#26241F"},{"name":"Clay","hex":"#A8503A"}]',
 '["1521572163474-6864f9cf17ab","1483985988355-763728e1935b"]',9),

('turtleneck-10','Merino Turtleneck','美利奴高领衫','Knitwear',120,null,null,
 'Fine-gauge extra-fine merino that layers invisibly under a coat yet stands on its own. Naturally temperature-regulating and itch-free.',
 '细针超细美利奴羊毛，藏于大衣内不臃肿，单穿也好看。天然调温，亲肤不扎。',
 '["XS","S","M","L","XL"]','[{"name":"Bone","hex":"#E0D8C7"},{"name":"Bordeaux","hex":"#6E2C2C"}]',
 '["1521577352947-9bb58764b69a","1469334031218-e382a71b716b"]',10),

('trench-11','Tailored Trench Coat','修身风衣','Outerwear',295,null,'New',
 'A water-repellent cotton-gabardine trench with all the heritage details — storm flap, belted waist and horn buttons — in a modern, lighter cut.',
 '防泼水棉华达呢风衣，保留所有经典细节——防风盖、束腰腰带与牛角扣，剪裁更现代轻盈。',
 '["XS","S","M","L","XL"]','[{"name":"Khaki","hex":"#B5A582"},{"name":"Black","hex":"#26241F"}]',
 '["1591047139829-d91aecb6caea","1539008835657-9e8e9680c956"]',11),

('tote-12','Structured Leather Tote','真皮托特包','Accessories',195,null,null,
 'A roomy vegetable-tanned leather tote that softens with age. Fits a 15" laptop, with an interior zip pocket to keep the small things found.',
 '大容量植鞣皮托特包，越用越柔软。可放 15 寸笔记本，内置拉链袋收纳零碎物品。',
 '["One Size"]','[{"name":"Tan","hex":"#B07B4F"},{"name":"Black","hex":"#26241F"}]',
 '["1524758631624-e2822e304c36","1604176354204-9268737828e4"]',12)

on conflict (id) do update set
  name=excluded.name, name_zh=excluded.name_zh, category=excluded.category,
  price=excluded.price, compare_at=excluded.compare_at, badge=excluded.badge,
  description=excluded.description, description_zh=excluded.description_zh,
  sizes=excluded.sizes, colors=excluded.colors, images=excluded.images, sort=excluded.sort;
