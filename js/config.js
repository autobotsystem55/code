/* =====================================================================
   STORE CONFIGURATION
   ---------------------------------------------------------------------
   This is the ONE place you need to edit for the basics of your store.
   ===================================================================== */

window.STORE_CONFIG = {
  /* --- Brand --- */
  brand: 'Code Official',                                  // ← your shop name (placeholder; change freely)
  tagline: 'Sweet, feminine everyday pieces',
  email: 'code.officialco@gmail.com',
  contactEmail: 'code.officialco@gmail.com',
  whatsapp: '60136744585',

  /* --- Language ---
     '' = auto-detect from the browser (Chinese browsers see 中文, others English).
     Force a default with 'en' or 'zh'. Visitors can switch with the EN/中 button. */
  defaultLang: '',

  /* --- Money --- */
  currency: 'MYR',          // ISO code reported to Facebook Pixel (e.g. 'USD', 'EUR', 'HKD', 'CNY', 'MYR')
  currencySymbol: 'RM',     // shown in the UI (e.g. 'RM', '$', '€', 'HK$')

  /* --- Payment ---
     Leave paymentLink empty for the built-in DEMO checkout (no real charge).
     To take REAL money, paste a Stripe Payment Link or PayPal link below — the
     checkout button then sends the customer there to pay. (In Stripe, set the
     link's "after payment" redirect to your success.html so Purchase still fires.) */
  paymentLink: '',

  /* --- Supabase (database: products, orders, members) ---
     The URL + anon key are PUBLIC and safe to ship in the browser. Real
     security comes from Row Level Security in the database (see schema.sql),
     not from hiding these. Leave blank to fall back to the local catalog. */
  supabaseUrl: 'https://gzuvbielelaefaelaxwt.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dXZiaWVsZWxhZWZhZWxheHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDkwMjMsImV4cCI6MjA5NzMyNTAyM30.aNhvDR963TXDst1OgeNvyqzRjfsi1Wy8RMV4Iokt1AM',

  /* --- Shipping --- */
  freeShippingThreshold: 150, // spend this much for free shipping
  shippingFlat: 10,           // flat shipping fee below the threshold

  /* --- Facebook / Meta Pixel ---
     1. Go to Meta Events Manager -> your Pixel -> copy the Pixel ID (a number).
     2. Paste it below, replacing YOUR_PIXEL_ID.
     Until you do, tracking is disabled automatically (no errors). */
  pixelId: 'YOUR_PIXEL_ID',

  /* --- Size chart (default) ---
     Shown on every product page between "Add to bag" and the accordions.
     Admins edit this in the Settings page; this is just the fallback. */
  sizeChart: {
    enabled: true,
    title: '',                  // empty → uses i18n default (尺码参考表 / Size reference)
    cm: true, inch: true,       // unit tabs to expose
    columns: [
      { key: 'bust',  label: '胸围' },
      { key: 'waist', label: '腰围' },
      { key: 'hip',   label: '臀围' },
      { key: 'len',   label: '衣长' }
    ],
    rows: [
      { size: 'XS', cm: { bust: 82,  waist: 62, hip: 86,  len: 58 }, inch: { bust: 32, waist: 24, hip: 34, len: 23 } },
      { size: 'S',  cm: { bust: 86,  waist: 66, hip: 90,  len: 59 }, inch: { bust: 34, waist: 26, hip: 35, len: 23 } },
      { size: 'M',  cm: { bust: 90,  waist: 70, hip: 94,  len: 60 }, inch: { bust: 35, waist: 28, hip: 37, len: 24 } },
      { size: 'L',  cm: { bust: 96,  waist: 76, hip: 100, len: 61 }, inch: { bust: 38, waist: 30, hip: 39, len: 24 } },
      { size: 'XL', cm: { bust: 102, waist: 82, hip: 106, len: 62 }, inch: { bust: 40, waist: 32, hip: 42, len: 24 } }
    ],
    note: '数据为成衣平铺测量，可能有 1–2 cm 误差。'
  }
};
