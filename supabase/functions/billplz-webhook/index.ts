// =====================================================================
// BILLPLZ-WEBHOOK · Supabase Edge Function
// ---------------------------------------------------------------------
// Billplz POSTs this URL (server-to-server) after a payment attempt.
// We verify the x_signature with HMAC-SHA256 so we know the payload is
// really from Billplz (not someone forging "paid=true"), then mark the
// matching order as paid in our database.
//
// Deployed with `verify_jwt = false` — Billplz can't carry a Supabase
// JWT. Authenticity is enforced by the x_signature check below.
//
// Required secrets:
//   BILLPLZ_X_SIGNATURE_KEY  — the X Signature Key from Billplz Settings
//
// Billplz sends application/x-www-form-urlencoded body:
//   id, collection_id, paid, state, amount, paid_amount, due_at, email,
//   mobile, name, url, paid_at, x_signature, plus any reference_* fields.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const text = (s: string, status = 200) =>
  new Response(s, { status, headers: { ...CORS, "Content-Type": "text/plain" } })

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Constant-time string compare so we don't leak timing info on the signature.
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return text("POST only", 405)

  const X_KEY = Deno.env.get("BILLPLZ_X_SIGNATURE_KEY")
  if (!X_KEY) return text("BILLPLZ_X_SIGNATURE_KEY not configured", 500)

  // Parse form-encoded body.
  let raw: string
  try { raw = await req.text() } catch { return text("bad body", 400) }
  const params = new URLSearchParams(raw)
  const fields: Record<string, string> = {}
  for (const [k, v] of params.entries()) fields[k] = v

  const receivedSig = fields["x_signature"] || ""
  if (!receivedSig) return text("missing x_signature", 400)

  // Build the source string Billplz signed:
  //   all fields except x_signature, sorted alphabetically by key,
  //   joined as "key1value1|key2value2|...".
  const source = Object.keys(fields)
    .filter((k) => k !== "x_signature")
    .sort()
    .map((k) => `${k}${fields[k]}`)
    .join("|")

  const expected = await hmacSha256Hex(X_KEY, source)
  if (!safeEq(expected, receivedSig)) return text("bad signature", 401)

  // Signature OK — find the order and mark it paid (if Billplz says so).
  const billId = fields["id"]
  const paid = fields["paid"] === "true"
  const paidAt = fields["paid_at"] || null
  const state = fields["state"] || ""
  if (!billId) return text("missing id", 400)

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const patch: Record<string, unknown> = {
    payment_status: paid ? "paid" : (state === "due" ? "pending" : "failed"),
  }
  if (paid) {
    patch.paid_at = paidAt || new Date().toISOString()
    patch.status = "paid"
  }

  // Match by bill_id first; fall back to reference_1 (we set it to order_number).
  const ref = fields["reference_1"] || ""
  const { error: upErr } = await supabase
    .from("orders")
    .update(patch)
    .or(`billplz_bill_id.eq.${billId}` + (ref ? `,order_number.eq.${ref}` : ""))

  if (upErr) {
    // Billplz retries on non-200, but if the error is structural (bad column,
    // RLS), retrying won't help. Log and accept so we don't loop.
    console.error("[billplz-webhook] update error:", upErr.message)
  }

  return text("ok")
})
