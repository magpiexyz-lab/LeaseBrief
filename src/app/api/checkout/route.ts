import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { trackServerEvent } from "@/lib/analytics-server";

// POST /api/checkout — b-07. Creates a Stripe Checkout session for the Pro
// plan ($19/mo + $5 overage). Returns `{ url }` for the client to redirect.
//
// Pricing is authoritative on the server (Stripe metadata.amount_cents flows
// to the webhook handler; never trust client-submitted prices — see
// security-review.md). User identity comes from the cookie session, not the
// request body.

export const checkoutSchema = z.object({
  plan: z.enum(["pro"]).default("pro"),
});
export type CreateCheckoutRequest = z.infer<typeof checkoutSchema>;
export type CreateCheckoutResponse = { url: string };

// Plan price table — server-only, never derived from client input.
// $19/mo with $5/overage is encoded as the up-front session amount; recurring
// subscription billing is wired by /deploy when STRIPE_PRICE_ID is provided.
const PLAN_PRICES: Record<string, { amount_cents: number; label: string }> = {
  pro: { amount_cents: 1900, label: "LeaseBrief Pro — 50 abstracts/mo" },
};

export async function POST(request: Request) {
  // ── rate limit (10/min/IP) — auth + payment routes per Rule 6. ─────────
  const ip = clientIpFromHeaders(request.headers);
  const { success } = rateLimit(ip, { limit: 10, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }
  // TODO: Upgrade to Upstash Redis for cross-instance rate limiting

  // ── auth — Pro upgrades require a signed-in user. ──────────────────────
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── parse + validate body. Generic 400 on schema failures — never leak
  //    Zod issue paths (OWASP A4 InfoLeakage). ────────────────────────────
  let parsed: CreateCheckoutRequest;
  try {
    const body = await request.json();
    parsed = checkoutSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = parsed.plan;
  const pricing = PLAN_PRICES[plan];
  if (!pricing) {
    // Unreachable given the enum-validated input, but keep the guard so
    // adding new enum values doesn't silently send `undefined` to Stripe.
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    "http://localhost:3000";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: pricing.label },
            unit_amount: pricing.amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan,
        amount_cents: String(pricing.amount_cents),
      },
      success_url: `${siteUrl}/dashboard?upgrade=success`,
      cancel_url: `${siteUrl}/pricing?upgrade=cancelled`,
    });

    if (!session.url) {
      console.error("Stripe session created but url was empty");
      return NextResponse.json(
        { error: "Checkout failed" },
        { status: 500 },
      );
    }

    // ── Fire server-side `checkout_started` (b-07 + EVENTS.yaml). Fire-and-
    //    forget — analytics failure must not break the checkout flow. ──────
    await trackServerEvent("checkout_started", user.id, {
      plan,
      amount_cents: pricing.amount_cents,
    });

    const response: CreateCheckoutResponse = { url: session.url };
    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "Stripe checkout failed:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
