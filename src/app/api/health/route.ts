import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  POSTHOG_HOST,
  POSTHOG_KEY,
} from "@/lib/analytics-server";

// LeaseBrief deployment health endpoint.
//
// Response shape is deliberately opaque: ONLY `{ status: "ok" | "degraded" }`.
// Per-subsystem detail is logged server-side via `console.error` so
// unauthenticated callers cannot probe infrastructure topology
// (OWASP A4-InfoLeakage). Critical (database, auth) failures → 503;
// non-critical (analytics, payment config) failures → 200 with `ok`.

export async function GET() {
  const checks: Record<string, "ok" | "degraded" | "error"> = {};

  // ─── database + auth (critical) — single Supabase client serves both ─────
  try {
    const supabase = await createServerSupabaseClient();

    // 1. database connectivity — lightweight existence query against a
    //    well-known LeaseBrief table. We don't care about rows; the round-trip
    //    confirms the SDK can reach Postgres + the RLS layer is responsive.
    try {
      const { error: dbError } = await supabase
        .from("users")
        .select("id")
        .limit(1);
      if (dbError) {
        console.error("Health check database error:", dbError.message);
        checks.database = "error";
      } else {
        checks.database = "ok";
      }
    } catch (e) {
      console.error(
        "Health check database error:",
        e instanceof Error ? e.message : String(e),
      );
      checks.database = "error";
    }

    // 2. auth service — getUser() with no session expects an *auth* error
    //    rather than a network error. We only care that the auth API
    //    responded. Either branch is "ok"; a thrown exception is "error".
    try {
      await supabase.auth.getUser();
      checks.auth = "ok";
    } catch (e) {
      console.error(
        "Health check auth error:",
        e instanceof Error ? e.message : String(e),
      );
      checks.auth = "error";
    }
  } catch (e) {
    console.error(
      "Health check supabase init error:",
      e instanceof Error ? e.message : String(e),
    );
    checks.database = "error";
    checks.auth = "error";
  }

  // ─── analytics reachability (non-critical) ───────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      const res = await fetch(`${POSTHOG_HOST}/decide?v=3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          distinct_id: "healthcheck",
        }),
        signal: controller.signal,
      });
      checks.analytics = res.ok ? "ok" : "degraded";
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // AbortError → degraded (timeout); any other failure → degraded
    // (analytics reachability is non-critical; do not 503 the deployment).
    console.error("Health check analytics error:", msg);
    checks.analytics = "degraded";
  }

  // ─── payment config (non-critical) ───────────────────────────────────────
  // Stripe secret keys begin with `sk_`. We don't make any outbound call —
  // the env var presence + prefix is sufficient signal at the health-check
  // layer, and an outbound Stripe ping per request would add cost and noise.
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (stripeKey && stripeKey.startsWith("sk_")) {
    checks.payment = "ok";
  } else {
    console.error(
      "Health check payment error: STRIPE_SECRET_KEY missing or malformed",
    );
    checks.payment = "error";
  }

  const critical = Object.entries(checks).filter(([k]) =>
    ["database", "auth"].includes(k),
  );
  const hasCriticalFailure = critical.some(([, v]) => v === "error");

  return NextResponse.json(
    { status: hasCriticalFailure ? "degraded" : "ok" },
    { status: hasCriticalFailure ? 503 : 200 },
  );
}
