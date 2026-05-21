import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

// POST /api/email/welcome-webhook — webhook-authed (no cookie session).
//
// Triggered by Supabase auth.user.created (and by /api/webhooks/stripe after
// a Pro checkout completes). Signature is verified via HMAC-SHA256 of the raw
// body against SUPABASE_WEBHOOK_SECRET. NO rate limiting — webhook providers
// retry, and a 429 silently drops the welcome email (see stripe.md stack
// knowledge: do not rate-limit signed webhooks). The signature IS the auth
// layer.

type WelcomePayload = {
  type: string;
  record?: {
    email?: string;
    raw_user_meta_data?: { name?: string };
  };
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SUPABASE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Service not configured" },
      { status: 503 },
    );
  }

  // Read raw body BEFORE parsing — signature is over the raw bytes.
  const raw = await req.text();
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WelcomePayload;
  try {
    payload = JSON.parse(raw) as WelcomePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (payload.type !== "INSERT" || !payload.record?.email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const ctaUrl = `${origin}/dashboard`;
  const name = payload.record.raw_user_meta_data?.name ?? "there";

  try {
    await sendWelcomeEmail(payload.record.email, name, ctaUrl);
  } catch (e) {
    console.error(
      "sendWelcomeEmail (webhook) failed:",
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json(
      { error: "Could not send email" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
