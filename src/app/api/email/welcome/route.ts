import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendWelcomeEmail } from "@/lib/email";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

// POST /api/email/welcome — cookie-authed.
//
// Sends a welcome email to the SIGNED-IN user. `to` is derived from the
// session, never from the body (per email/resend.md Caveats — accepting
// `to` from the body turns this into an open phishing relay).

export const welcomeSchema = z.object({
  name: z.string().max(200).default("there"),
});
export type WelcomeEmailRequest = z.infer<typeof welcomeSchema>;
export type WelcomeEmailResponse = { ok: true };

export async function POST(req: NextRequest) {
  // ── auth ───────────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── rate limit — per-user, 3/day. Use a stable per-user key + an IP
  //    floor so anonymous abusers can't cycle through. ────────────────────
  const ip = clientIpFromHeaders(req.headers);
  const ipCheck = rateLimit(ip, { limit: 30, windowMs: 60_000 });
  if (!ipCheck.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }
  const userCheck = rateLimit(`email:welcome:${user.id}`, {
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!userCheck.success) {
    return NextResponse.json(
      { error: "Too many welcome requests" },
      { status: 429 },
    );
  }
  // TODO: Upgrade to Upstash Redis for cross-instance rate limiting

  // ── parse body. Only `name` is accepted; `to`/`ctaUrl` come from the
  //    session and server config — see Caveats in email/resend.md. ─────────
  let parsed: WelcomeEmailRequest;
  try {
    const body = await req.json().catch(() => ({}));
    parsed = welcomeSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const ctaUrl = `${origin}/dashboard`;

  try {
    await sendWelcomeEmail(user.email, parsed.name, ctaUrl);
  } catch (e) {
    console.error(
      "sendWelcomeEmail failed:",
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json(
      { error: "Could not send email" },
      { status: 500 },
    );
  }

  const response: WelcomeEmailResponse = { ok: true };
  return NextResponse.json(response);
}
