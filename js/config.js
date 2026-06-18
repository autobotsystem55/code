/* =====================================================================
   STORE CONFIGURATION
   ---------------------------------------------------------------------
   This is the ONE place you need to edit for the basics of your store.
   ===================================================================== */

window.STORE_CONFIG = {
  /* --- Brand --- */
  brand: 'Code Official',                                  // ← your shop name (placeholder; change freely)
  tagline: 'Sweet, feminine everyday pieces',
  email: 'hello@petale-boutique.com',

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
};
