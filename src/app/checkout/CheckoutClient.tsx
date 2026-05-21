"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackCheckoutStarted } from "@/lib/events";

type Status = "preparing" | "creating" | "redirecting" | "error" | "missing";

/**
 * /checkout bridge page.
 *
 * Owns the moment between "user clicked Upgrade on /pricing" and Stripe-hosted
 * checkout. Steps:
 *
 *   1. Read `?plan=pro&abstract_count=N` from the URL.
 *   2. Fire `checkout_started` (typed wrapper, monetize funnel) with
 *      `abstract_count_at_upgrade` — required by experiment/EVENTS.yaml
 *      and behavior b-07.
 *   3. POST { plan } to /api/checkout. That route returns { url } —
 *      the Stripe Checkout session URL.
 *   4. window.location.assign() to the Stripe URL. The Stripe-hosted page
 *      is a different origin, so we leave Next.js routing behind here.
 *
 * If anything fails (rate limit, auth, network), we render a recoverable
 * error state with a "Back to pricing" CTA — never a dead end.
 *
 * NOTE: scaffold-wire will create /api/checkout (Phase B3). At write time
 * the route does not exist yet; the fetch will 404 in local dev until
 * scaffold-wire runs. That is expected per the procedure file.
 */
export function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  const [status, setStatus] = useState<Status>("preparing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plan = searchParams.get("plan");
  const abstractCountRaw = searchParams.get("abstract_count");
  const abstractCount = (() => {
    if (!abstractCountRaw) return 0;
    const n = Number(abstractCountRaw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  })();

  useEffect(() => {
    // Guard against React 18 dev-mode double effect AND against any
    // re-trigger that could double-fire the analytics event.
    if (startedRef.current) return;

    // Missing/invalid plan = explicit error state, not a redirect loop.
    if (!plan || plan.length === 0) {
      setStatus("missing");
      return;
    }
    if (plan !== "pro") {
      setStatus("error");
      setErrorMessage(
        `We don't recognize the plan "${plan}". Head back to pricing and try again.`,
      );
      return;
    }

    startedRef.current = true;

    async function run() {
      // 1) Fire checkout_started BEFORE the network call so we capture
      //    intent even when the API errors. This is required by b-07.
      trackCheckoutStarted({
        abstract_count_at_upgrade: abstractCount,
        variant: "pro",
      });

      // 2) Ask /api/checkout for a Stripe session URL.
      setStatus("creating");
      let response: Response;
      try {
        response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
      } catch (err) {
        console.error("[checkout] network error", err);
        setStatus("error");
        setErrorMessage(
          "We couldn't reach our payment service. Check your connection and try again.",
        );
        return;
      }

      if (!response.ok) {
        // Parse the structured error if there is one; fall back to status text.
        let body: { error?: string; code?: string } = {};
        try {
          body = (await response.json()) as typeof body;
        } catch {
          /* non-JSON response — fall through */
        }
        const message =
          response.status === 429
            ? "Too many checkout attempts in a short window. Wait a minute and try again."
            : response.status === 401
              ? "You'll need to sign in before subscribing."
              : (body.error ??
                `Checkout failed (${response.status}). Please try again.`);
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      // 3) Consume the response and hand off to Stripe.
      const data = (await response.json()) as { url?: string };
      if (!data?.url) {
        setStatus("error");
        setErrorMessage(
          "Checkout responded without a session URL. Please try again.",
        );
        return;
      }

      setStatus("redirecting");

      // Internal URLs (the demo-mode Stripe stub returns "/") stay inside
      // Next.js routing. External Stripe URLs need a full document assign.
      if (data.url.startsWith("/")) {
        router.push(data.url);
      } else {
        window.location.assign(data.url);
      }
    }

    void run();
  }, [plan, abstractCount, router]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="bg-brass-halo absolute inset-x-0 top-0 -z-10 h-[520px]"
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8 pb-4 md:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
          aria-label="LeaseBrief home"
        >
          <span>L</span>
          <span>B</span>
          <span className="ml-1 inline-block h-[1.5px] w-6 align-middle bg-accent" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-foreground/70 md:flex">
          <Link
            href="/pricing"
            className="transition-colors hover:text-foreground"
          >
            Back to pricing
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center justify-center px-6 pb-24 md:px-8">
        <Card className="w-full rounded-card border-0 bg-card ring-card-heavy">
          <CardContent className="px-8 py-12 md:px-14 md:py-16">
            {(status === "preparing" ||
              status === "creating" ||
              status === "redirecting") && (
              <LoadingPanel status={status} abstractCount={abstractCount} />
            )}

            {status === "error" && (
              <ErrorPanel
                title="Checkout couldn't open"
                description={
                  errorMessage ??
                  "Something interrupted the handoff to our payment provider."
                }
                onRetry={() => {
                  // Hard reload so the useEffect runs fresh against the same
                  // search params and re-fires the trackCheckoutStarted event
                  // intentionally — a retry IS a new monetize attempt.
                  if (typeof window !== "undefined") {
                    window.location.reload();
                  }
                }}
              />
            )}

            {status === "missing" && (
              <ErrorPanel
                title="No plan selected"
                description="It looks like you came here without picking a plan. Take a look at pricing and choose the one that fits your monthly volume."
                showRetry={false}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function LoadingPanel({
  status,
  abstractCount,
}: {
  status: Status;
  abstractCount: number;
}) {
  const headline =
    status === "preparing"
      ? "Preparing your checkout…"
      : status === "creating"
        ? "Opening a secure session…"
        : "Handing you off to Stripe…";

  const subline =
    status === "preparing"
      ? "We're putting your order together."
      : status === "creating"
        ? "Talking to our payment provider — this is usually a second or two."
        : "If your browser doesn't redirect in a moment, refresh this page.";

  return (
    <div className="flex flex-col items-center text-center">
      {/* Signature beam — quietly draws while the API request resolves.
          Echoes the landing page's "30 fields in 90 seconds" beam motif. */}
      <div
        aria-hidden
        className="relative h-1 w-44 overflow-hidden rounded-full bg-foreground/[0.06]"
      >
        <span
          className="absolute inset-y-0 left-0 block w-1/3 origin-left rounded-full bg-accent"
          style={{
            animation:
              "checkout-sweep 1400ms cubic-bezier(0.16, 1, 0.3, 1) infinite",
          }}
        />
      </div>

      <p className="eyebrow mt-9">§ STEP 2 OF 3</p>

      <h1 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-[40px]">
        {headline}
      </h1>

      <p className="mt-5 max-w-md font-body text-base leading-relaxed text-foreground/70">
        {subline}
      </p>

      {/* Order summary — what they're about to pay for */}
      <div className="mt-10 w-full max-w-md rounded-card bg-secondary/40 px-6 py-5 ring-card-light">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55">
              LeaseBrief Pro
            </p>
            <p className="mt-1 font-body text-sm text-foreground/70">
              50 abstracts included · $5 per overage
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-medium tracking-tight text-foreground">
              $399
            </p>
            <p className="font-body text-xs text-foreground/55">/ month</p>
          </div>
        </div>

        {abstractCount > 0 && (
          <p className="mt-4 border-t border-border pt-4 font-body text-xs text-foreground/55">
            Upgrading after{" "}
            <span className="font-mono text-foreground/80">
              {abstractCount}
            </span>{" "}
            completed{" "}
            {abstractCount === 1 ? "abstract" : "abstracts"}.
          </p>
        )}
      </div>

      <p className="mt-7 font-body text-xs text-foreground/45">
        Secure checkout is hosted by Stripe.
      </p>

      <style>
        {
          "@keyframes checkout-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}"
        }
      </style>
    </div>
  );
}

function ErrorPanel({
  title,
  description,
  onRetry,
  showRetry = true,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  return (
    <div className="flex flex-col items-start text-left md:items-center md:text-center">
      <span
        aria-hidden
        className="font-display text-5xl italic leading-none text-accent/80"
      >
        ¶
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight md:text-[40px]">
        {title}
      </h1>

      <p className="mt-5 max-w-lg font-body text-base leading-relaxed text-foreground/70">
        {description}
      </p>

      <div className="mt-9 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            size="lg"
            className="h-12 rounded-pill bg-accent px-6 font-body text-base font-medium text-accent-foreground shadow-[0_0_0_1px_rgba(26,34,56,0.06),0_4px_8px_rgba(200,152,85,0.18)] transition-all duration-180 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(26,34,56,0.08),0_8px_24px_rgba(200,152,85,0.32)]"
          >
            Try again
          </Button>
        )}
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center justify-center rounded-[8px] border border-foreground/15 bg-transparent px-5 font-body text-base text-foreground transition-colors duration-150 hover:bg-foreground/[0.04]"
        >
          Back to pricing
        </Link>
      </div>
    </div>
  );
}
