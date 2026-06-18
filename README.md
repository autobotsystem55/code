# Code Official — clothing store

A fast, Shopify-style online clothing store built as a static site
(HTML + CSS + vanilla JS). No build step, no dependencies. Includes a
working cart, checkout flow, **Facebook/Meta Pixel** tracking and full
**SEO + Open Graph meta tags**.

## Run it locally

Just open `index.html` in a browser — or, better, serve it (so paths
behave exactly like in production):

```powershell
# from this folder
python -m http.server 5500
# then open http://localhost:5500
```

## Project structure

```
index.html        Home / landing
shop.html         Product listing (filter by category + sort)
product.html      Product detail (?id=...) — fires ViewContent
checkout.html     Checkout form + order summary — fires InitiateCheckout
success.html      Order confirmation — fires Purchase, clears the cart
css/styles.css    All styling (the design system)
js/config.js      ⭐ Brand, currency, shipping, Pixel ID, language, payment link
js/pixel.js       Meta Pixel bootstrap + event helpers
js/i18n.js        English / 中文 translations + language switch
js/products.js    ⭐ Your product catalog (bilingual)
js/store.js       Cart, drawer, shared header/footer, rendering
images/           Fallback placeholder
```

## 1) Add your Facebook Pixel ID

Open **`js/config.js`** and replace `YOUR_PIXEL_ID`:

```js
pixelId: '1234567890123456',   // from Meta Events Manager
```

Until you do, tracking is **safely disabled** (it logs to the console
instead of erroring, so you can test the flow first).

### Events that fire (same set Shopify sends)
| Event | When |
|---|---|
| `PageView` | every page |
| `ViewContent` | product detail page |
| `AddToCart` | add to bag / quick add |
| `InitiateCheckout` | checkout page loads |
| `Purchase` | order confirmation page |

Verify them live with the **Meta Pixel Helper** Chrome extension.

## 2) Edit the meta tags

Each `.html` file has its SEO block in `<head>`: `<title>`,
`description`, Open Graph (`og:*`) and Twitter card tags. Update the text
and, before going live, replace the placeholder domain
`https://www.maisoneclat.com/` (in `canonical` + `og:url`) with your own,
and swap the `og:image` URLs for your own 1200×630 image.

## 3) Add your products

Edit **`js/products.js`**. Each product:

```js
{
  id: 'unique-id', name: 'Product Name', category: 'Outerwear',
  price: 120, compareAt: 160, badge: 'Sale',     // compareAt + badge optional
  images: ['unsplash-id', 'images/my-photo.jpg'], // ids OR local paths/URLs
  colors: [{ name: 'Camel', hex: '#C2A07A' }],
  sizes: ['XS','S','M','L','XL'],
  description: '…'
}
```

For Chinese, fill `name_zh` and `description_zh` on each product (if left
blank, the English text is shown in 中文 mode too).

Demo photos come from Unsplash. Replace them with your own product
photos (drop files in `images/` and use e.g. `images/coat-front.jpg`).

## 4) Brand & currency

All in `js/config.js`: `brand`, `tagline`, `currency`, `currencySymbol`,
`freeShippingThreshold`, `shippingFlat`.

## 5) Language (English / 中文)

The site is bilingual. A visitor toggles language with the **EN / 中**
button in the header (their choice is remembered).

- UI text lives in `js/i18n.js` (two dictionaries: `en` and `zh`).
- Product text is bilingual in `js/products.js` (`name` + `name_zh`, etc.).
- Default language in `js/config.js` → `defaultLang`: `''` auto-detects from
  the browser, or force `'en'` / `'zh'`.
- Note: the `<head>` SEO/OG meta tags stay in one language — edit those by hand.

## 6) Real payments (one-line switch)

The checkout has a built-in switch. In `js/config.js`:

```js
paymentLink: '',   // empty = DEMO checkout (no real charge)
```

Paste a **Stripe Payment Link** (or PayPal link) and the checkout button
changes to **“Proceed to payment”**, hides the demo card fields, and sends
the customer to that link to pay. In Stripe, set the link’s *after-payment
redirect* to your `success.html` so the `Purchase` event still fires.

For a fuller setup (per-item Stripe Checkout, a backend that stores orders,
inventory, etc.) just ask and I can wire it.

## Deploy (free)

Drag this folder onto **Netlify Drop**, or push to GitHub and connect
**Vercel** / **GitHub Pages / Cloudflare Pages**. It's just static files.
