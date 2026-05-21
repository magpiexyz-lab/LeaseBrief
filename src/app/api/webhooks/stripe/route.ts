import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { trackServerEvent } from "@/lib/analytics-server";

// POST /api/webhooks/stripe — b-09 system actor.
//
// Stripe calls this endpoint with `checkout.session.completed` (and other
// events) after a user completes a Pro checkout. We:
//   1. Verify the request signature against STRIPE_WEBHOOK_SECRET — that IS
//      the auth layer. No rate limiting (see stack knowledge: Stripe retries
//      delivery, a 429 silently drops the event).
//   2. INSERT into stripe_events for atomic idempotency (catch PG 23505).
//   3. On checkout.session.completed:
//        a. Upsert the user row to plan='pro', persist stripe_customer_id,
//           quota_monthly=50, current_period_end ≈ now+30d.
//        b. Fire `checkout_completed` server-side per experiment/EVENTS.yaml.
//        c. Queue a welcome email via /api/email/welcome-webhook (fire-and-
//           forget — failure here must NOT mark the webhook as failed).
//
// Per CLAUDE.md Rule 6 + stripe.md "Do not rate-limit signed webhook
// endpoints": no `rateLimit()` call here. Signature verification is the
// defense.

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Service not configured" },
      { status: 503 },
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(
      "Stripe signature verification failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // ── idempotency guard: INSERT + catch PG 23505 (unique_violation). ─────
  //    The PRIMARY KEY on stripe_events.stripe_event_id makes this atomic;
  //    a SELECT-then-INSERT check is a TOCTOU race that can double-process
  //    payments under concurrent Stripe delivery.
  const supabase = createServiceRoleClient();
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({ stripe_event_id: event.id });
  if (insertErr) {
    if ((insertErr as { code?: string }).code === "23505") {
      // Replay — already processed. Acknowledge so Stripe stops retrying.
      return NextResponse.json({ received: true });
    }
    console.error("stripe_events insert error:", insertErr.message);
    return NextResponse.json(
      { error: "Persistence error" },
      { status: 500 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan ?? "pro";
    const amountCents = Number(session.metadata?.amount_cents ?? 0);

    // Identity MUST come from session.metadata (set at checkout creation by
    // an authenticated server route), NEVER from session.customer_email —
    // that field is attacker-controllable (see stripe.md stack knowledge).
    if (!userId) {
      console.error(
        "checkout.session.completed missing metadata.user_id — refusing to provision",
      );
      return NextResponse.json({ received: true });
    }

    // ── Update the user's plan + Stripe billing state (b-09 contract). ──
    const customerId =
      typeof session.customer === "string" ? session.customer : null;
    const nextPeriodEnd = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        plan,
        stripe_customer_id: customerId,
        quota_monthly: 50,
        current_period_end: nextPeriodEnd,
      })
      .eq("id", userId);

    if (updateErr) {
      console.error(
        "users plan update failed for user",
        userId,
        ":",
        updateErr.message,
      );
      // Stripe should retry — return 500 so the event is re-delivered.
      return NextResponse.json(
        { error: "Persistence error" },
        { status: 500 },
      );
    }

    // ── Fire server-side checkout_completed (b-09 + experiment/EVENTS.yaml).
    //    The event schema expects { plan, amount_usd } — convert cents.
    await trackServerEvent("checkout_completed", userId, {
      plan,
      amount_usd: Math.round(amountCents / 100),
    });

    // ── Queue the welcome email. Fire-and-forget: the webhook is paid for
    //    the plan transition only; an email service blip must not regress
    //    the user's plan or cause Stripe to retry. ─────────────────────────
    if (session.customer_details?.email) {
      try {
        const origin =
          process.env.NEXT_PUBLIC_APP_ORIGIN ??
          process.env.NEXT_PUBLIC_SITE_URL ??
          "http://localhost:3000";
        const secret = process.env.SUPABASE_WEBHOOK_SECRET;
        if (secret) {
          // Best-effort: hit our welcome-webhook with a synthesized
          // signed payload so the same code path that handles Supabase
          // auth.user.created is used.
          const { createHmac } = await import("crypto");
          const payload = JSON.stringify({
            type: "INSERT",
            record: {
              email: session.customer_details.email,
              raw_user_meta_data: {
                name: session.customer_details.name ?? "",
              },
            },
          });
          const sig = createHmac("sha256", secret)
            .update(payload)
            .digest("hex");
          await fetch(`${origin}/api/email/welcome-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-signature": sig,
            },
            body: payload,
          }).catch((e) => {
            console.error(
              "welcome email enqueue failed:",
              e instanceof Error ? e.message : String(e),
            );
          });
        }
      } catch (e) {
        console.error(
          "welcome email enqueue threw:",
          e instanceof Error ? e.message : String(e),
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
