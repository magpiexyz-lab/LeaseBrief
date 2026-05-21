"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase";
import { trackLandingView } from "@/lib/events";

/**
 * Anchor figures — used in copy below.
 * Source: experiment.yaml h-04 / b-07 / variant `cost`.
 */
const PRO_MONTHLY_PRICE_USD = 399;
const PRO_INCLUDED_ABSTRACTS = 50;
const PRO_OVERAGE_PRICE_USD = 5;
const OUTSOURCED_PRICE_MIN_USD = 200;
const OUTSOURCED_PRICE_MAX_USD = 500;
const OUTSOURCED_PRICE_MID_USD = 300; // midpoint for break-even math

/**
 * Read the signed-in user's count of completed abstracts.
 * Falls back to 0 when no user is signed in or RLS denies the read.
 * This value is sent with the `checkout_started` event per experiment/EVENTS.yaml.
 */
async function fetchAbstractCountAtUpgrade(): Promise<number> {
  const supabase = createClient();
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult?.user?.id;
  if (!userId) return 0;
  // demo / placeholder mode: counts come back as the seed data length.
  // production: only the signed-in user's approved rows count toward upgrade.
  const result = await supabase
    .from("abstracts")
    .select("id, status, user_id");
  const rows = (result as { data?: Array<{ status?: string; user_id?: string }> })
    .data;
  if (!Array.isArray(rows)) return 0;
  return rows.filter(
    (row) => row.status === "approved" && row.user_id === userId,
  ).length;
}

export function PricingClient() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackedRef = useRef(false);

  // Page mount: fire landing_view so the pricing page registers as a funnel
  // surface (anchor for the monetize step in analytics).
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackLandingView({ variant: "pricing", referrer: document.referrer });
  }, []);

  async function handleUpgrade() {
    setError(null);
    setIsRedirecting(true);
    try {
      const count = await fetchAbstractCountAtUpgrade();
      // Hand the page off to /checkout, which initiates the Stripe session
      // and fires `checkout_started` with abstract_count_at_upgrade.
      router.push(
        `/checkout?plan=pro&abstract_count=${encodeURIComponent(String(count))}`,
      );
    } catch (err) {
      console.error("[pricing] upgrade redirect failed", err);
      setError(
        "We couldn't start checkout. Please try again — if it persists, refresh the page.",
      );
      setIsRedirecting(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen bg-background">
      {/* Brass radial halo — atmospheric depth at the hero */}
      <div
        aria-hidden
        className="bg-brass-halo absolute inset-x-0 top-0 -z-10 h-[640px]"
      />

      {/* ───────────── Header strip ───────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8 pb-4 md:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          <span className="text-foreground">L</span>
          <span className="text-foreground">B</span>
          <span className="ml-1 inline-block h-[1.5px] w-6 align-middle bg-accent" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-foreground/80 md:flex">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-32 md:px-8">
        {/* ───────────── Hero ───────────── */}
        <section className="pt-12 md:pt-20">
          <p className="eyebrow">THE TRADE</p>
          <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.04] tracking-tight text-foreground md:text-[68px]">
            One bill. Fifty abstracts.
            <br />
            <span className="italic text-foreground/90">
              No more $300-each surprises.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-foreground/80 md:text-xl">
            LeaseBrief replaces the per-lease invoice from Datapoint, Lease
            Probe and the other outsourcers with one flat monthly line item.
            Cancel after a month if it doesn&apos;t pay for itself — most
            customers break even by their second abstract.
          </p>

          {/* Anchor strip — the differentiator visualized */}
          <div className="mt-12 rounded-card overflow-hidden ring-1 ring-border ring-card bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <AnchorCell
                label="OUTSOURCED ABSTRACT"
                value={`$${OUTSOURCED_PRICE_MIN_USD}–${OUTSOURCED_PRICE_MAX_USD}`}
                unit="per lease"
                caption="Datapoint, Lease Probe — 24-72 hour turnaround"
                tone="muted"
              />
              <AnchorCell
                label="IN-HOUSE ABSTRACT"
                value="4–8 hrs"
                unit="per lease"
                caption="$300-1,200 in broker time at $75-150/hr"
                tone="muted"
                bordered
              />
              <AnchorCell
                label="LEASEBRIEF"
                value={`$${PRO_MONTHLY_PRICE_USD}`}
                unit={`/mo · ${PRO_INCLUDED_ABSTRACTS} abstracts`}
                caption="≈ $8 per abstract. 90 seconds each."
                tone="brass"
                bordered
              />
            </div>
          </div>
        </section>

        {/* ───────────── Pricing card ───────────── */}
        <section className="mt-24 grid grid-cols-1 gap-8 md:mt-28 md:grid-cols-5 md:gap-10">
          {/* Pro plan card — primary surface, brass-prominent */}
          <Card className="relative col-span-1 overflow-hidden rounded-card ring-card-heavy md:col-span-3">
            <div
              aria-hidden
              className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent/15 blur-2xl"
            />
            <CardHeader className="space-y-3 px-8 pt-8">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-chip border-0 bg-accent/15 px-2.5 py-0.5 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground"
                >
                  § Pro plan
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-chip border-border bg-transparent px-2.5 py-0.5 font-body text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60"
                >
                  Most teams pick this
                </Badge>
              </div>
              <CardTitle className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                LeaseBrief Pro
              </CardTitle>
              <p className="font-body text-foreground/70">
                For brokers and analysts running 10–50 lease abstracts a month.
                Built for daily use, not occasional projects.
              </p>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              {/* Price block — JetBrains Mono for numerics */}
              <div className="mt-2 flex items-end gap-2">
                <span className="font-mono text-6xl font-medium leading-none tracking-tight text-foreground md:text-7xl">
                  ${PRO_MONTHLY_PRICE_USD}
                </span>
                <span className="mb-2 font-body text-base text-foreground/60">
                  / month
                </span>
              </div>

              <div className="mt-2 font-body text-sm text-foreground/70">
                <span className="font-mono text-foreground/90">
                  {PRO_INCLUDED_ABSTRACTS}
                </span>{" "}
                abstracts included · then{" "}
                <span className="font-mono text-foreground/90">
                  ${PRO_OVERAGE_PRICE_USD}
                </span>{" "}
                per additional abstract. No annual contract.
              </div>

              <Separator className="my-7 bg-border" />

              <ul className="space-y-3.5">
                <Feature>
                  30-field structured abstract in under 90 seconds, every time
                </Feature>
                <Feature>
                  Per-field confidence scoring with an inline review queue
                </Feature>
                <Feature>
                  Export to Yardi, MRI Software and AppFolio Commercial
                  formats
                </Feature>
                <Feature>
                  Unlimited team members on shared abstracts
                </Feature>
                <Feature>
                  Documents stay in your tenancy — no third-party reviewers
                </Feature>
                <Feature>
                  Priority email support, weekday turnaround
                </Feature>
              </ul>

              {/* Primary CTA — brass-prominent pill */}
              <div className="mt-9 flex flex-col gap-3">
                <Button
                  onClick={handleUpgrade}
                  disabled={isRedirecting}
                  size="lg"
                  className="group h-14 rounded-pill bg-accent px-7 font-body text-base font-medium text-accent-foreground shadow-[0_0_0_1px_rgba(26,34,56,0.06),0_4px_8px_rgba(200,152,85,0.18),0_8px_16px_rgba(26,34,56,0.08)] transition-all duration-180 hover:shadow-[0_0_0_1px_rgba(26,34,56,0.08),0_8px_24px_rgba(200,152,85,0.32),0_16px_36px_rgba(26,34,56,0.10)] hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {isRedirecting ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Spinner />
                      Opening secure checkout…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Upgrade to Pro
                      <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </Button>
                {error && (
                  <p
                    role="alert"
                    className="font-body text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
                <p className="font-body text-xs text-foreground/55">
                  Secure checkout via Stripe. Cancel anytime from your
                  dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Side: math + free tier */}
          <div className="col-span-1 flex flex-col gap-6 md:col-span-2">
            {/* Break-even math card */}
            <Card className="rounded-card ring-card border-0 bg-card">
              <CardHeader className="px-7 pt-7 pb-2">
                <p className="eyebrow">THE MATH</p>
                <CardTitle className="mt-2 font-display text-2xl font-medium leading-snug tracking-tight">
                  Break-even after roughly 1.3 abstracts.
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-7 pb-7 pt-4">
                <MathRow
                  label="Outsourced cost"
                  value={`$${OUTSOURCED_PRICE_MID_USD}`}
                  hint="per lease (midpoint)"
                />
                <MathRow
                  label="LeaseBrief monthly"
                  value={`$${PRO_MONTHLY_PRICE_USD}`}
                  hint="50 abstracts included"
                />
                <Separator className="my-1 bg-border" />
                <MathRow
                  label="Outsourced equivalent"
                  value={`$${(OUTSOURCED_PRICE_MID_USD * PRO_INCLUDED_ABSTRACTS).toLocaleString()}`}
                  hint={`if you ran 50 leases through Datapoint`}
                  emphasis
                />
                <p className="pt-2 font-body text-sm leading-relaxed text-foreground/70">
                  The average mid-market broker runs 15–30 leases a month.
                  LeaseBrief pays for itself{" "}
                  <span className="font-medium text-foreground">
                    well before the second one
                  </span>
                  .
                </p>
              </CardContent>
            </Card>

            {/* Free tier card */}
            <Card className="rounded-card border-0 bg-card/60 ring-card-light">
              <CardHeader className="px-7 pt-7 pb-2">
                <p className="eyebrow">STILL EVALUATING?</p>
                <CardTitle className="mt-2 font-display text-xl font-medium tracking-tight">
                  Free tier — up to 3 abstracts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-7 pb-7 pt-4">
                <p className="font-body text-sm leading-relaxed text-foreground/70">
                  Run your first three lease abstracts at no cost. Exports
                  carry a small &quot;Drafted with LeaseBrief&quot; footer
                  watermark until you upgrade.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-[8px] border border-foreground/15 bg-transparent px-4 font-body text-sm text-foreground transition-colors duration-150 hover:bg-foreground/[0.04]"
                >
                  Open the dashboard
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ───────────── Comparison table ───────────── */}
        <section className="mt-28">
          <p className="eyebrow">SIDE BY SIDE</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            How LeaseBrief compares to what you&apos;re paying for today.
          </h2>

          <div className="mt-10 overflow-hidden rounded-card ring-1 ring-border ring-card bg-card">
            <ComparisonTable />
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section className="mt-28">
          <p className="eyebrow">DETAILS</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Questions worth asking.
          </h2>

          <Accordion className="mt-8 w-full max-w-3xl">
            <AccordionItem
              value="overage"
              className="border-b border-border"
            >
              <AccordionTrigger className="font-display text-lg font-medium hover:no-underline">
                What happens after 50 abstracts in a month?
              </AccordionTrigger>
              <AccordionContent className="font-body text-base text-foreground/75">
                Additional abstracts bill at ${PRO_OVERAGE_PRICE_USD} each
                against the card on file. We show running usage on your
                dashboard and email you when you cross 40 abstracts so there
                are no surprises at the period close.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="contract"
              className="border-b border-border"
            >
              <AccordionTrigger className="font-display text-lg font-medium hover:no-underline">
                Is there an annual contract?
              </AccordionTrigger>
              <AccordionContent className="font-body text-base text-foreground/75">
                No. LeaseBrief is month-to-month. Cancel from your dashboard
                in one click and you keep access through the period
                you&apos;ve paid for.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="security"
              className="border-b border-border"
            >
              <AccordionTrigger className="font-display text-lg font-medium hover:no-underline">
                Who sees the lease documents we upload?
              </AccordionTrigger>
              <AccordionContent className="font-body text-base text-foreground/75">
                Only your team. Documents are stored in your Supabase tenancy
                under row-level security policies that scope every read to
                the uploading user. Low-confidence fields are routed to{" "}
                <em>your</em> review queue — never to an outsourced
                reviewer.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="export"
              className="border-b border-border"
            >
              <AccordionTrigger className="font-display text-lg font-medium hover:no-underline">
                Which property-management formats do you export?
              </AccordionTrigger>
              <AccordionContent className="font-body text-base text-foreground/75">
                Yardi Voyager, MRI Software, and AppFolio Commercial — the
                three formats that cover the majority of mid-market US and
                Canadian CRE portfolios. CSV downloads match each
                vendor&apos;s import spec one-for-one.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="enterprise"
              className="border-b border-border"
            >
              <AccordionTrigger className="font-display text-lg font-medium hover:no-underline">
                Do you offer team / enterprise pricing?
              </AccordionTrigger>
              <AccordionContent className="font-body text-base text-foreground/75">
                The $399/month plan already includes unlimited team members
                on a shared abstract library. For desks running more than
                100 abstracts a month or needing SSO/SAML, email{" "}
                <span className="font-medium text-foreground">
                  team@leasebrief.app
                </span>
                .
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* ───────────── Final CTA ───────────── */}
        <section className="mt-28">
          <div className="relative isolate overflow-hidden rounded-card bg-card ring-card-heavy">
            <div
              aria-hidden
              className="bg-brass-halo absolute inset-0 -z-10"
            />
            <div className="grid grid-cols-1 items-center gap-8 px-8 py-12 md:grid-cols-2 md:gap-12 md:px-14 md:py-16">
              <div>
                <p className="eyebrow">¶ READY?</p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                  Stop paying per lease.
                  <br />
                  <span className="italic">Start running them yourself.</span>
                </h2>
                <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-foreground/70">
                  One $399 line item replaces a stack of $300 invoices.
                  Cancel after a month if it doesn&apos;t.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <Button
                  onClick={handleUpgrade}
                  disabled={isRedirecting}
                  size="lg"
                  className="group h-14 rounded-pill bg-accent px-8 font-body text-base font-medium text-accent-foreground shadow-[0_0_0_1px_rgba(26,34,56,0.06),0_4px_8px_rgba(200,152,85,0.18),0_8px_16px_rgba(26,34,56,0.08)] transition-all duration-180 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(26,34,56,0.08),0_8px_24px_rgba(200,152,85,0.32),0_16px_36px_rgba(26,34,56,0.10)] disabled:opacity-70"
                >
                  {isRedirecting ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Spinner />
                      Opening secure checkout…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Upgrade to Pro — ${PRO_MONTHLY_PRICE_USD}/mo
                      <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </Button>
                <Link
                  href="/dashboard"
                  className="font-body text-sm text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Or keep using the free tier →
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center font-display text-base italic text-foreground/40">
            §
          </p>
        </section>
      </main>
    </div>
  );
}

/* ───────────── helpers ───────────── */

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 font-body text-[15px] leading-relaxed text-foreground/85">
      <BrassCheck className="mt-1 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function BrassCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="8" cy="8" r="7.5" stroke="var(--brass)" strokeOpacity="0.4" />
      <path
        d="M4.5 8.2l2.4 2.3 4.6-5"
        stroke="var(--brass)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M3.5 9h11M10 4.5L14.5 9 10 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      role="status"
      aria-label="Loading"
    />
  );
}

function AnchorCell({
  label,
  value,
  unit,
  caption,
  tone,
  bordered = false,
}: {
  label: string;
  value: string;
  unit: string;
  caption: string;
  tone: "muted" | "brass";
  bordered?: boolean;
}) {
  const isBrass = tone === "brass";
  return (
    <div
      className={[
        "p-6 md:p-8",
        bordered ? "md:border-l md:border-border" : "",
        isBrass ? "bg-accent/[0.06]" : "",
      ].join(" ")}
    >
      <p
        className={[
          "font-body text-[11px] font-semibold uppercase tracking-[0.08em]",
          isBrass ? "text-foreground" : "text-foreground/55",
        ].join(" ")}
      >
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={[
            "font-mono text-3xl font-medium tracking-tight md:text-[40px]",
            isBrass ? "text-foreground" : "text-foreground/85",
          ].join(" ")}
        >
          {value}
        </span>
        <span className="font-body text-sm text-foreground/55">{unit}</span>
      </div>
      <p
        className={[
          "mt-3 font-body text-sm leading-relaxed",
          isBrass ? "text-foreground/75" : "text-foreground/55",
        ].join(" ")}
      >
        {caption}
      </p>
      {isBrass && (
        <div
          aria-hidden
          className="mt-5 h-[1.5px] w-12 origin-left bg-accent"
        />
      )}
    </div>
  );
}

function MathRow({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <p
          className={[
            "font-body text-sm",
            emphasis ? "text-foreground" : "text-foreground/70",
          ].join(" ")}
        >
          {label}
        </p>
        {hint && (
          <p className="font-body text-xs text-foreground/45">{hint}</p>
        )}
      </div>
      <p
        className={[
          "font-mono shrink-0 tracking-tight",
          emphasis
            ? "text-2xl font-medium text-foreground"
            : "text-lg text-foreground/80",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    {
      feature: "Cost per abstract",
      outsourced: "$200–500",
      inhouse: "$300–1,200 (time)",
      leasebrief: "≈$8 (in plan)",
    },
    {
      feature: "Turnaround",
      outsourced: "24–72 hours",
      inhouse: "4–8 hours",
      leasebrief: "≈90 seconds",
    },
    {
      feature: "Per-field confidence",
      outsourced: "—",
      inhouse: "—",
      leasebrief: "Yes",
    },
    {
      feature: "Documents stay in-house",
      outsourced: "No",
      inhouse: "Yes",
      leasebrief: "Yes",
    },
    {
      feature: "Yardi / MRI / AppFolio export",
      outsourced: "Sometimes",
      inhouse: "Manual",
      leasebrief: "One click",
    },
    {
      feature: "Predictable monthly cost",
      outsourced: "No",
      inhouse: "No",
      leasebrief: "Yes",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-4 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55 md:px-8">
              &nbsp;
            </th>
            <th className="px-6 py-4 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55 md:px-8">
              Outsourced
            </th>
            <th className="px-6 py-4 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55 md:px-8">
              In-house
            </th>
            <th className="bg-accent/[0.06] px-6 py-4 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground md:px-8">
              LeaseBrief
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.feature}
              className={
                i === rows.length - 1
                  ? ""
                  : "border-b border-border"
              }
            >
              <td className="px-6 py-4 font-body text-[15px] text-foreground md:px-8">
                {r.feature}
              </td>
              <td className="px-6 py-4 font-mono text-sm text-foreground/65 md:px-8">
                {r.outsourced}
              </td>
              <td className="px-6 py-4 font-mono text-sm text-foreground/65 md:px-8">
                {r.inhouse}
              </td>
              <td className="bg-accent/[0.06] px-6 py-4 font-mono text-sm font-medium text-foreground md:px-8">
                {r.leasebrief}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
