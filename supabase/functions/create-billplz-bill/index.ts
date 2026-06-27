// =====================================================================
// CREATE-BILLPLZ-BILL · Supabase Edge Function
// ---------------------------------------------------------------------
// Called from checkout.html when STORE_CONFIG.paymentMode === 'billplz'.
// Looks up the just-created order, asks Billplz to open a Bill, stores
// the returned bill_id on the order, and returns the payment URL so the
// browser can redirect the customer to Billplz's hosted payment page.
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   BILLPLZ_API_KEY         — your Billplz Secret Key
//   BILLPLZ_COLLECTION_ID   — your Billplz Collection ID
//   BILLPLZ_SANDBOX         — "true" for sandbox, "false" for production
//
// Request body (JSON):
//   { order_number, email, redirect_url, name?, mobile? }
// Response: { url, bill_id }   — caller does `location.href = url`
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })

function normalizeMobile(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = String(raw).replace(/[^\d+]/g, "")
  if (!s) return null
  if (s.startsWith("+")) return s
  if (s.startsWith("60")) return "+" + s
  if (s.startsWith("0")) return "+6" + s
  return "+" + s
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "POST only" }, 405)

  let payload: any
  try { payload = await req.json() } catch { return json({ error: "invalid JSON" }, 400) }

  const orderNumber = String(payload?.order_number || "").trim()
  const callerEmail = String(payload?.email || "").trim().toLowerCase()
  const redirectUrl = String(payload?.redirect_url || "").trim()
  if (!orderNumber || !callerEmail || !redirectUrl) {
    return json({ error: "order_number, email, redirect_url required" }, 400)
  }

  const API_KEY = Deno.env.get("BILLPLZ_API_KEY")
  const COLLECTION_ID = Deno.env.get("BILLPLZ_COLLECTION_ID")
  const SANDBOX = (Deno.env.get("BILLPLZ_SANDBOX") || "true").toLowerCase() !== "false"
  if (!API_KEY || !COLLECTION_ID) {
    return json({ error: "BILLPLZ_API_KEY / BILLPLZ_COLLECTION_ID not configured" }, 500)
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Look up the order. Verify email matches so randoms can't spawn bills
  //    for other people's orders just by guessing an order number.
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("order_number, email, total, currency, customer, billplz_bill_id, payment_status")
    .eq("order_number", orderNumber)
    .maybeSingle()

  if (orderErr || !order) return json({ error: "order not found" }, 404)
  if (String(order.email || "").toLowerCase() !== callerEmail) {
    return json({ error: "order/email mismatch" }, 403)
  }
  if (order.payment_status === "paid") {
    return json({ error: "order already paid" }, 409)
  }

  // 2) Build the Billplz Bill request.
  const cust = (order.customer || {}) as Record<string, unknown>
  const name = String(payload.name || [cust.first, cust.last].filter(Boolean).join(" ") || "Customer").slice(0, 100)
  const mobile = normalizeMobile(payload.mobile || (cust.phone as string))
  const amountCents = Math.round(Number(order.total) * 100)
  if (!(amountCents > 0)) return json({ error: "invalid amount" }, 400)

  const callbackUrl = `${SUPABASE_URL}/functions/v1/billplz-webhook`
  const billplzApi = SANDBOX
    ? "https://www.billplz-sandbox.com/api/v3"
    : "https://www.billplz.com/api/v3"

  const body = new URLSearchParams({
    collection_id: COLLECTION_ID,
    email: order.email || callerEmail,
    name,
    amount: String(amountCents),
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    description: `Order #${order.order_number}`,
    reference_1_label: "Order",
    reference_1: order.order_number,
  })
  if (mobile) body.append("mobile", mobile)

  // 3) Call Billplz.
  const auth = btoa(`${API_KEY}:`)
  const r = await fetch(`${billplzApi}/bills`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  const result = await r.json().catch(() => ({}))

  if (!r.ok || !result?.id || !result?.url) {
    return json({
      error: result?.error?.message || result?.error || "billplz create failed",
      detail: result,
    }, r.status || 502)
  }

  // 4) Save bill_id on the order so the webhook can find it later.
  await supabase
    .from("orders")
    .update({ billplz_bill_id: result.id })
    .eq("order_number", orderNumber)

  return json({ url: result.url, bill_id: result.id })
})
