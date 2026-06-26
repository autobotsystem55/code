// =====================================================================
// SEND-EMAIL · Supabase Edge Function
// ---------------------------------------------------------------------
// Sends a branded HTML email via Resend.
// Called from the admin page (`window.sb.functions.invoke('send-email', ...)`)
// and (later) from the checkout flow for order confirmation.
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — your Resend API key (re_...)
//   RESEND_FROM     — sender, e.g. "Code Official <noreply@codeofficial.com.my>"
//                     While the domain isn't verified yet, use:
//                     "Code Official <onboarding@resend.dev>"
//                     (Resend will only deliver to the email that registered
//                     the account in this test mode.)
//
// Request body (JSON):
//   { to, subject, body, cta_text?, cta_url?, brand?, tagline?, footer? }
//
// Auth: caller must be a signed-in admin (profiles.is_admin = true).
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

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildHtml(opts: {
  subject: string
  body: string
  brand?: string
  tagline?: string
  cta_text?: string
  cta_url?: string
  footer?: string
}) {
  const brand = escapeHtml(opts.brand || "Code Official")
  const tagline = escapeHtml(opts.tagline || "FRENCH ELEGANCE · KL")
  const footer = escapeHtml(opts.footer || "法式优雅，源自吉隆坡")
  const subject = escapeHtml(opts.subject || "")
  // Body: escape then convert newlines to <br>
  const safeBody = escapeHtml(opts.body || "").replace(/\n/g, "<br>")

  const cta = opts.cta_text && opts.cta_url
    ? `<tr><td align="center" style="padding:8px 36px 28px 36px">
         <a href="${escapeHtml(opts.cta_url)}" style="display:inline-block;padding:14px 36px;background:#82213E;color:#FFFAF1;text-decoration:none;font-size:13.5px;border-radius:3px;letter-spacing:.05em;font-family:Georgia,'Times New Roman',serif">${escapeHtml(opts.cta_text)}</a>
       </td></tr>`
    : ""

  return `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F5EFE3;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C1C1C">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F5EFE3;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#FFFAF1;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);max-width:600px;width:100%">
      <tr><td style="background:#82213E;padding:34px 24px;text-align:center">
        <div style="font-family:Georgia,'Times New Roman',serif;color:#FFFAF1;font-size:26px;letter-spacing:.08em">${brand}</div>
        <div style="color:#FFFAF1;opacity:.7;font-size:10px;letter-spacing:.28em;margin-top:8px">${tagline}</div>
      </td></tr>
      <tr><td style="padding:34px 36px 14px 36px">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.4;color:#1C1C1C;margin-bottom:18px">${subject}</div>
        <div style="font-size:14.5px;line-height:1.8;color:#3A3A3A">${safeBody}</div>
      </td></tr>
      ${cta}
      <tr><td style="padding:6px 36px 32px 36px">
        <div style="border-top:1px solid #EAE0CE;padding-top:20px;font-size:11.5px;line-height:1.75;color:#9A8E7E;text-align:center;font-family:Georgia,'Times New Roman',serif">
          <b style="color:#1C1C1C">${brand}</b> · ${footer}<br>
          <span style="color:#B4A893">您收到此邮件是因为在 codeofficial.com.my 进行了订购</span>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "POST only" }, 405)

  let payload: any
  try { payload = await req.json() } catch { return json({ error: "invalid JSON" }, 400) }

  const { to, subject, body, cta_text, cta_url, brand, tagline, footer } = payload || {}
  if (!to || !subject) return json({ error: "to and subject are required" }, 400)

  // ---- Admin check via Supabase JWT ----
  const authHeader = req.headers.get("Authorization") || ""
  const jwt = authHeader.replace(/^Bearer\s+/i, "")
  if (!jwt) return json({ error: "not signed in" }, 401)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt)
  const user = userRes?.user
  if (userErr || !user) return json({ error: "invalid session" }, 401)

  const { data: prof } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
  if (!prof?.is_admin) return json({ error: "admin only" }, 403)

  // ---- Send via Resend ----
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY")
  const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Code Official <onboarding@resend.dev>"
  if (!RESEND_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500)

  const html = buildHtml({ subject, body, brand, tagline, cta_text, cta_url, footer })

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  })

  const result = await r.json().catch(() => ({}))
  if (!r.ok) return json({ error: result.message || "send failed", detail: result }, r.status)

  return json({ ok: true, id: result.id })
})
