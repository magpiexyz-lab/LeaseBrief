"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackCtaClick, trackLandingView, trackQualifiedPaidVisit } from "@/lib/events";
import {
  buildAttributionProps,
  classifyChannel,
} from "@/lib/analytics-attribution";
import type { Variant } from "@/lib/variants";
import { BrandLockup, Monogram } from "@/components/brand-mark";
import { Reveal } from "./Reveal";
import { NumberTicker } from "./NumberTicker";

// ─────────────────────────────────────────────────────────────────────────────
// LandingPage — the editorial LeaseBrief landing.
// Rendered by both `src/app/page.tsx` (root, default variant) and
// `src/app/v/[variant]/page.tsx` (variant routes). Receives a `Variant` and
// renders variant-specific copy through a shared structural layout.
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage({ variant }: { variant: Variant }) {
  useEffect(() => {
    const attribution = buildAttributionProps();
    trackLandingView({
      variant: variant.slug,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      referrer: attribution.referrer,
    });
    const channel = classifyChannel(attribution);
    if (channel) {
      trackQualifiedPaidVisit({
        source_channel: channel,
        variant: variant.slug,
      });
    }
  }, [variant.slug]);

  const handleCta = (position: "hero" | "midpage" | "footer" | "nav") => () => {
    trackCtaClick({ variant: variant.slug, cta_position: position });
  };

  return (
    <main className="relative isolate min-h-screen bg-[var(--parchment)] text-[var(--ink)]">
      {/* Hairline ink rule at the very top — document-edge feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px"
        style={{ background: "rgba(26,34,56,0.08)" }}
      />

      <TopNav variant={variant} onCtaClick={handleCta("nav")} />

      <Hero variant={variant} onCtaClick={handleCta("hero")} />

      <ProofStrip />

      <Workflow />

      <PainLedger variant={variant} />

      <ProofBlock variant={variant} onCtaClick={handleCta("midpage")} />

      <SamplePreview />

      <PricingAnchor variant={variant} onCtaClick={handleCta("midpage")} />

      <Faq />

      <FinalCta variant={variant} onCtaClick={handleCta("footer")} />

      <Footer />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LB monogram — letterform mark in Fraunces with brass underline.
// ─────────────────────────────────────────────────────────────────────────────

// Monogram is imported from @/components/brand-mark at the top of the file
// so the landing page and the NavBar render the same lockup.

// ─────────────────────────────────────────────────────────────────────────────
// Top nav — minimal, document letterhead feel.
// ─────────────────────────────────────────────────────────────────────────────

function TopNav({
  variant,
  onCtaClick,
}: {
  variant: Variant;
  onCtaClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--parchment)]/85 border-b border-[rgba(26,34,56,0.06)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4 md:px-8 md:py-5">
        <Link
          href="/"
          className="inline-flex"
          aria-label="LeaseBrief home"
        >
          <BrandLockup monogramSize={24} wordmarkSize={18} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#workflow"
            className="text-[14px] font-medium text-[var(--whisper)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            The work
          </a>
          <a
            href="#sample"
            className="text-[14px] font-medium text-[var(--whisper)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Sample abstract
          </a>
          <a
            href="#pricing"
            className="text-[14px] font-medium text-[var(--whisper)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Pricing
          </a>
          <Link
            href="/login"
            className="text-[14px] font-medium text-[var(--whisper)] transition-colors duration-150 hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
        </nav>

        <Link
          href="/signup"
          onClick={onCtaClick}
          className="group/cta relative inline-flex items-center gap-1.5 overflow-hidden rounded-[10px] border border-[rgba(26,34,56,0.12)] bg-[var(--vellum)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] transition-all duration-150 hover:border-[var(--brass)] hover:bg-[var(--brass)]/8 md:px-4 md:text-[14px]"
        >
          <span>{variant.cta}</span>
          <ArrowGlyph />
        </Link>
      </div>
      <div
        aria-hidden
        className="mx-auto h-px max-w-[1200px]"
        style={{ background: "rgba(26,34,56,0.06)" }}
      />
    </header>
  );
}

// Tiny arrow glyph (no lucide — keeps the document mark feeling)
function ArrowGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className={`transition-transform duration-150 group-hover/cta:translate-x-0.5 ${className}`}
    >
      <path
        d="M1.5 6h9M7 2.5L10.5 6 7 9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — left half: copy. Right half: hero image with floating abstract card.
// Brass radial halo + paper-grain via globals.css.
// ─────────────────────────────────────────────────────────────────────────────

function Hero({
  variant,
  onCtaClick,
}: {
  variant: Variant;
  onCtaClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden bg-brass-halo">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 pt-14 pb-24 md:px-8 md:pt-20 md:pb-32 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* LEFT — editorial copy block */}
        <div className="relative z-10">
          <Reveal delay={0}>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)]/4 px-3 py-1.5 ring-1 ring-[rgba(26,34,56,0.08)]">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--brass)" }}
              />
              <span className="eyebrow">
                For mid-market CRE brokers · {variant.slug} brief
              </span>
            </div>
          </Reveal>

          <Reveal delay={80} className="mt-6">
            <h1
              className="text-[44px] leading-[1.02] font-semibold tracking-[-0.025em] text-[var(--ink)] sm:text-[56px] md:text-[68px] lg:text-[80px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {renderHeadlineWithBrassAccent(variant)}
            </h1>
          </Reveal>

          <Reveal delay={160} className="mt-6">
            <p
              className="max-w-[560px] text-[17px] leading-[1.55] text-[var(--whisper)] sm:text-[19px]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {variant.subheadline}
            </p>
          </Reveal>

          <Reveal delay={240} className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              onClick={onCtaClick}
              className="group/cta relative inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-7 py-3.5 text-[15px] font-semibold text-[var(--ink)] transition-all duration-150 hover:shadow-[0_0_0_4px_rgba(200,152,85,0.18),0_12px_28px_rgba(200,152,85,0.32)] active:translate-y-px"
              style={{ boxShadow: "var(--shadow-medium)", fontFamily: "var(--font-body)" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(26,34,56,0.06)",
                }}
              />
              <span className="relative">{variant.cta}</span>
              <ArrowGlyph className="relative" />
            </Link>
            <a
              href="#sample"
              className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink)]"
            >
              <span className="relative">
                See a sample abstract
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 left-0 h-px w-0 bg-[var(--ink)] transition-[width] duration-200 group-hover:w-full"
                  style={{ transitionTimingFunction: "var(--ease-snap)" }}
                />
              </span>
              <ArrowGlyph />
            </a>
          </Reveal>

          {/* Signature extraction beam + tickers */}
          <Reveal delay={320} className="mt-10">
            <ExtractionBeam />
          </Reveal>

          {/* Micro reassurance row */}
          <Reveal delay={420} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--whisper)]">
            <span className="inline-flex items-center gap-2">
              <Check />
              No credit card to try
            </span>
            <span className="inline-flex items-center gap-2">
              <Check />
              Yardi, MRI, AppFolio export
            </span>
            <span className="inline-flex items-center gap-2">
              <Check />
              Your data never trains a model
            </span>
          </Reveal>
        </div>

        {/* RIGHT — image + floating abstract card */}
        <div className="relative">
          <Reveal delay={120}>
            <div
              className="relative overflow-hidden rounded-[18px]"
              style={{ boxShadow: "var(--shadow-heavy)" }}
            >
              {/* Subtle ink ring */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-[rgba(26,34,56,0.08)]"
              />
              <Image
                src="/images/hero.webp"
                alt="Commercial lease binder opened to a typeset lease agreement with a brass nameplate and pen on a walnut desk."
                width={1920}
                height={1088}
                priority
                sizes="(min-width: 1024px) 520px, (min-width: 768px) 80vw, 100vw"
                className="h-auto w-full"
              />
              {/* Warm vignette to harmonize with parchment */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(247,244,236,0.18) 0%, rgba(247,244,236,0) 28%, rgba(26,34,56,0.04) 100%)",
                }}
              />
            </div>
          </Reveal>

          {/* Floating abstract card (anchored bottom-left of image, hidden on mobile) */}
          <Reveal delay={420} className="absolute -bottom-10 -left-6 hidden w-[300px] md:block">
            <AbstractFloatCard />
          </Reveal>

          {/* Floating confidence chip top-right */}
          <Reveal delay={520} className="absolute -top-5 right-4 hidden md:block">
            <div
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--vellum)] px-3 py-2 text-[12px] font-medium text-[var(--ink)]"
              style={{ boxShadow: "var(--shadow-medium)" }}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--confidence-high)" }}
              />
              <span style={{ fontFamily: "var(--font-mono)" }}>0.97</span>
              <span className="text-[var(--whisper)]">base_rent</span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Hairline */}
      <div
        aria-hidden
        className="mx-auto h-px max-w-[1200px]"
        style={{ background: "rgba(26,34,56,0.06)" }}
      />
    </section>
  );
}

// Splits the variant headline into ink text + brass-accented final clause for
// editorial emphasis. The clause is variant-specific so the brass lands on the
// actual differentiator (90 Seconds / $300 / Never Leave).
function renderHeadlineWithBrassAccent(variant: Variant) {
  const accents: Record<string, { match: string; underline?: boolean }> = {
    speed: { match: "90 Seconds", underline: true },
    cost: { match: "$300 Per Lease", underline: true },
    confidential: { match: "Never Leave Your Team", underline: true },
  };
  const accent = accents[variant.slug];
  if (!accent) {
    return variant.headline;
  }
  const idx = variant.headline.indexOf(accent.match);
  if (idx === -1) {
    return variant.headline;
  }
  const before = variant.headline.slice(0, idx);
  const after = variant.headline.slice(idx + accent.match.length);
  return (
    <>
      {before}
      <span className="relative inline-block whitespace-nowrap text-[var(--ink)]">
        <span className="italic" style={{ fontFamily: "var(--font-display)" }}>
          {accent.match}
        </span>
        {accent.underline && (
          <span
            aria-hidden
            className="absolute -bottom-1 left-0 right-0 h-[3px]"
            style={{ background: "var(--brass)" }}
          />
        )}
      </span>
      {after}
    </>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="6.5" stroke="rgba(26,34,56,0.18)" />
      <path
        d="M4 7.2L6 9.2L10 5"
        stroke="var(--brass)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction beam — the signature animation. A brass hairline sweeps L→R while
// two NumberTickers count 0→30 (fields) and 0→90 (seconds).
// ─────────────────────────────────────────────────────────────────────────────

function ExtractionBeam() {
  return (
    <div className="max-w-[520px]">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <NumberTicker
            value={30}
            className="text-[28px] font-medium tabular-nums text-[var(--ink)]"
            duration={1800}
          />
          <span className="text-[12px] font-medium tracking-[0.08em] text-[var(--whisper)] uppercase">
            fields extracted
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <NumberTicker
            value={90}
            className="text-[28px] font-medium tabular-nums text-[var(--ink)]"
            suffix="s"
            duration={2200}
          />
          <span className="text-[12px] font-medium tracking-[0.08em] text-[var(--whisper)] uppercase">
            average
          </span>
        </div>
      </div>
      <div
        className="mt-3 h-[2px] w-full overflow-hidden rounded-full"
        style={{ background: "rgba(26,34,56,0.08)" }}
      >
        <BeamFill />
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--whisper)]">
        <span style={{ fontFamily: "var(--font-mono)" }}>00:00</span>
        <span style={{ fontFamily: "var(--font-mono)" }}>01:30</span>
      </div>
    </div>
  );
}

function BeamFill() {
  return (
    <span
      aria-hidden
      className="block h-full origin-left animate-[lb-beam_2400ms_var(--ease-snap)_forwards]"
      style={{
        transform: "scaleX(0)",
        background: "linear-gradient(90deg, var(--brass) 0%, #e6b96d 100%)",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating abstract card — small dossier preview anchored to hero image.
// ─────────────────────────────────────────────────────────────────────────────

function AbstractFloatCard() {
  const rows: Array<{ field: string; value: string; conf: number; flag?: "high" | "review" }> = [
    { field: "base_rent", value: "$42.50 / sf NNN", conf: 0.97, flag: "high" },
    { field: "term_months", value: "84", conf: 0.99, flag: "high" },
    { field: "escalation", value: "3% annual", conf: 0.92, flag: "high" },
    { field: "option_to_extend", value: "1 × 60 mo @ FMR", conf: 0.78, flag: "review" },
  ];
  return (
    <div
      className="overflow-hidden rounded-[14px] bg-[var(--vellum)]"
      style={{ boxShadow: "var(--shadow-heavy)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(26,34,56,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--confidence-high)" }}
          />
          <span className="text-[11px] font-medium tracking-[0.12em] text-[var(--ink)] uppercase">
            Abstract · ready
          </span>
        </div>
        <span
          className="text-[10px] text-[var(--whisper)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          LB-2618
        </span>
      </div>
      <div className="divide-y divide-[rgba(26,34,56,0.06)]">
        {rows.map((r) => (
          <div key={r.field} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <div
                className="text-[10px] tracking-[0.08em] text-[var(--whisper)] uppercase"
              >
                {r.field}
              </div>
              <div
                className="truncate text-[13px] text-[var(--ink)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {r.value}
              </div>
            </div>
            <div
              className="ml-3 inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px]"
              style={{
                background:
                  r.flag === "review"
                    ? "rgba(213,154,58,0.14)"
                    : "rgba(61,138,90,0.12)",
                color:
                  r.flag === "review" ? "var(--review-amber)" : "var(--confidence-high)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {r.conf.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof strip — logo strip + 3 metric counters. Quiet credentials notch.
// ─────────────────────────────────────────────────────────────────────────────

function ProofStrip() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-16 md:px-8 md:py-20">
        <Reveal delay={200}>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] sm:grid-cols-3"
            style={{ background: "rgba(26,34,56,0.08)", boxShadow: "var(--shadow-light)" }}
          >
            <MetricTile
              value={90}
              suffix="s"
              caption="Average end-to-end extraction"
              detail="from drop to abstract"
            />
            <MetricTile
              value={30}
              caption="Structured fields"
              detail="rent, term, options, NNN/CAM"
            />
            <MetricTile
              value={19}
              prefix="$"
              caption="Flat monthly"
              detail="50 abstracts included · $5 overage"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MetricTile({
  value,
  prefix,
  suffix,
  caption,
  detail,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  caption: string;
  detail: string;
}) {
  return (
    <div className="bg-[var(--vellum)] px-6 py-8 md:px-8 md:py-10">
      <div className="flex items-baseline gap-2">
        <NumberTicker
          value={value}
          prefix={prefix}
          suffix={suffix}
          className="text-[44px] leading-none font-semibold tabular-nums text-[var(--ink)] md:text-[56px]"
          duration={1600}
        />
      </div>
      <div className="mt-3 text-[14px] font-medium text-[var(--ink)]">{caption}</div>
      <div className="mt-1 text-[13px] text-[var(--whisper)]">{detail}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow — three editorial steps with feature illustrations.
// Layout intentionally varies: large step number, copy beside, image below.
// ─────────────────────────────────────────────────────────────────────────────

function Workflow() {
  const steps = [
    {
      n: "01",
      eyebrow: "The drop",
      title: "Drop any commercial lease PDF",
      body:
        "Drag a scanned or native PDF onto your dashboard. We handle multi-page office, retail, industrial, and ground leases — and the addenda your tenant slipped into the last exhibit.",
      image: "/images/feature-1.webp",
      imageAlt:
        "Hairline editorial illustration of an analog stopwatch over a stack of lease pages, ink-navy linework on parchment cream with a single brass second hand accent.",
      stat: { value: "90", suffix: "s", label: "to a finished abstract" },
    },
    {
      n: "02",
      eyebrow: "The work",
      title: "30 fields render with per-field confidence",
      body:
        "Base rent, escalation type, term, options to extend, NNN/CAM pass-through, free rent, TI allowance — extracted and scored. Anything under 0.85 confidence is routed to your in-house review queue.",
      image: "/images/feature-2.webp",
      imageAlt:
        "Hairline editorial illustration of a lease document seen at slight angle, with curly brackets isolating one paragraph clause and a brass-filled confidence ring beside it.",
      stat: { value: "0.85", label: "confidence threshold", suffix: "" },
    },
    {
      n: "03",
      eyebrow: "The trade",
      title: "One-click export to Yardi, MRI, AppFolio",
      body:
        "Generated CSVs match each platform's import spec column-for-column. No more re-keying a finished abstract into your portfolio system, no more reformatting another contractor's spreadsheet.",
      image: "/images/feature-3.webp",
      imageAlt:
        "Hairline editorial illustration of one source lease document fanning into three destination documents with distinct format patterns, connected by thin arrows.",
      stat: { value: "3", label: "supported CRE platforms", suffix: "" },
    },
  ];

  return (
    <section id="workflow" className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <div className="flex items-baseline justify-between gap-6">
            <div className="max-w-[680px]">
              <span className="eyebrow">The work</span>
              <h2
                className="mt-4 text-[36px] leading-[1.06] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[52px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How an abstract comes together.
              </h2>
              <p
                className="mt-4 max-w-[580px] text-[17px] leading-[1.55] text-[var(--whisper)] md:text-[18px]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Three steps. The same thirty fields a senior associate would
                pull, returned in the time it takes to brew a fresh cup.
              </p>
            </div>
            <span
              aria-hidden
              className="hidden text-[40px] leading-none text-[var(--ash)] md:inline-block"
              style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
            >
              §
            </span>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] md:grid-cols-3"
          style={{ background: "rgba(26,34,56,0.08)", boxShadow: "var(--shadow-medium)" }}
        >
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <article className="relative flex h-full flex-col bg-[var(--vellum)] p-7 md:p-8">
                <div className="flex items-start justify-between">
                  <span
                    className="text-[40px] leading-none font-semibold text-[var(--brass)] md:text-[52px]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.n}
                  </span>
                  <span className="eyebrow">{s.eyebrow}</span>
                </div>

                <div className="mt-6 overflow-hidden rounded-[10px]"
                  style={{ background: "var(--parchment)" }}
                >
                  <Image
                    src={s.image}
                    alt={s.imageAlt}
                    width={1920}
                    height={1493}
                    sizes="(min-width: 768px) 360px, 100vw"
                    className="h-auto w-full"
                  />
                </div>

                <h3
                  className="mt-7 text-[22px] leading-[1.18] font-semibold text-[var(--ink)] md:text-[24px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {s.title}
                </h3>
                <p
                  className="mt-3 flex-1 text-[15px] leading-[1.6] text-[var(--whisper)]"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {s.body}
                </p>

                <div
                  className="mt-6 flex items-baseline justify-between border-t pt-4"
                  style={{ borderColor: "rgba(26,34,56,0.08)" }}
                >
                  <span
                    className="text-[24px] leading-none font-medium text-[var(--ink)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {s.stat.value}
                    {s.stat.suffix}
                  </span>
                  <span className="text-[12px] tracking-[0.06em] text-[var(--whisper)] uppercase">
                    {s.stat.label}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pain ledger — variant-specific pains in ledger / margin-note format.
// ─────────────────────────────────────────────────────────────────────────────

function PainLedger({ variant }: { variant: Variant }) {
  return (
    <section className="relative bg-[var(--ink)] text-[var(--parchment)]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[640px]">
              <span
                className="text-[13px] font-medium tracking-[0.08em] uppercase"
                style={{ color: "rgba(247,244,236,0.55)" }}
              >
                The cost of doing it by hand
              </span>
              <h2
                className="mt-4 text-[36px] leading-[1.06] font-semibold tracking-[-0.02em] text-[var(--parchment)] md:text-[52px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Three places this is{" "}
                <span
                  className="italic"
                  style={{ color: "var(--brass)", fontFamily: "var(--font-display)" }}
                >
                  bleeding margin
                </span>{" "}
                this month.
              </h2>
            </div>
            <p
              className="max-w-[360px] text-[15px] leading-[1.6]"
              style={{ color: "rgba(247,244,236,0.62)", fontFamily: "var(--font-body)" }}
            >
              From real mid-market brokerage workflows — what we keep hearing
              from brokers losing afternoons to lease abstraction.
            </p>
          </div>
        </Reveal>

        <ol className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[14px] md:grid-cols-3"
          style={{ background: "rgba(247,244,236,0.12)" }}
        >
          {variant.painPoints.map((pain, i) => (
            <Reveal key={i} delay={i * 80}>
              <li
                className="flex h-full flex-col gap-6 bg-[var(--ink)] px-7 py-9 md:px-8 md:py-10"
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-[15px] font-medium"
                    style={{ color: "var(--brass)", fontFamily: "var(--font-mono)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className="text-[24px] leading-none italic"
                    style={{ color: "rgba(200,152,85,0.45)", fontFamily: "var(--font-display)" }}
                  >
                    ¶
                  </span>
                </div>
                <p
                  className="text-[18px] leading-[1.45] text-[var(--parchment)] md:text-[20px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {pain}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof block — variant.proof in editorial pull-quote treatment + promise CTA.
// ─────────────────────────────────────────────────────────────────────────────

function ProofBlock({
  variant,
  onCtaClick,
}: {
  variant: Variant;
  onCtaClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 10% 50%, rgba(200,152,85,0.10), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 py-24 md:px-8 md:py-32 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <Reveal>
            <span className="eyebrow">The math</span>
          </Reveal>
          <Reveal delay={120} className="mt-5">
            <blockquote className="relative">
              <span
                aria-hidden
                className="absolute -left-4 -top-6 text-[120px] leading-none text-[var(--brass)]/35"
                style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}
              >
                &ldquo;
              </span>
              <p
                className="relative text-[28px] leading-[1.22] font-medium tracking-[-0.015em] text-[var(--ink)] md:text-[40px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {variant.proof}
              </p>
            </blockquote>
          </Reveal>
          <Reveal delay={200} className="mt-8 flex items-center gap-4">
            <span
              aria-hidden
              className="block h-[2px] w-12"
              style={{ background: "var(--brass)" }}
            />
            <span
              className="text-[14px] font-medium tracking-[0.04em] text-[var(--whisper)] uppercase"
            >
              LeaseBrief · {variant.slug} brief
            </span>
          </Reveal>
        </div>

        <div>
          <Reveal delay={160}>
            <div
              className="overflow-hidden rounded-[14px] bg-[var(--vellum)] p-8 md:p-10"
              style={{ boxShadow: "var(--shadow-heavy)" }}
            >
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">The promise</span>
                <span
                  aria-hidden
                  className="text-[20px] leading-none italic text-[var(--ash)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  §
                </span>
              </div>
              <p
                className="mt-5 text-[22px] leading-[1.32] font-medium text-[var(--ink)] md:text-[26px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {variant.promise}
              </p>
              <p
                className="mt-5 text-[15px] leading-[1.6] text-[var(--whisper)]"
              >
                {variant.urgency}
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/signup"
                  onClick={onCtaClick}
                  className="group/cta relative inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-6 py-3 text-[14px] font-semibold text-[var(--ink)] transition-all duration-150 hover:shadow-[0_0_0_4px_rgba(200,152,85,0.18),0_10px_24px_rgba(200,152,85,0.28)] active:translate-y-px"
                  style={{ boxShadow: "var(--shadow-medium)" }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(26,34,56,0.06)",
                    }}
                  />
                  <span className="relative">{variant.cta}</span>
                  <ArrowGlyph className="relative" />
                </Link>
                <span className="text-[13px] text-[var(--whisper)]">
                  90-second first abstract · no card needed
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample abstract — large editorial preview of the actual product output.
// ─────────────────────────────────────────────────────────────────────────────

function SamplePreview() {
  type SampleField = { name: string; value: string; conf: number };
  const groups: Array<{ title: string; rows: SampleField[] }> = [
    {
      title: "Rent",
      rows: [
        { name: "base_rent", value: "$42.50 / sf NNN", conf: 0.97 },
        { name: "escalation_type", value: "Fixed 3% annual", conf: 0.93 },
        { name: "free_rent_months", value: "4", conf: 0.88 },
        { name: "ti_allowance", value: "$45 / sf", conf: 0.91 },
      ],
    },
    {
      title: "Term & options",
      rows: [
        { name: "term_months", value: "84", conf: 0.99 },
        { name: "commencement", value: "2026-08-01", conf: 0.96 },
        { name: "expiration", value: "2033-07-31", conf: 0.96 },
        { name: "option_to_extend", value: "1 × 60 mo @ FMR", conf: 0.78 },
      ],
    },
    {
      title: "NNN / CAM",
      rows: [
        { name: "cam_pass_through", value: "Pro-rata, ex-cap ex.", conf: 0.86 },
        { name: "real_estate_taxes", value: "Tenant pro-rata", conf: 0.94 },
        { name: "insurance", value: "Tenant maintains", conf: 0.92 },
        { name: "operating_caps", value: "5% cumulative", conf: 0.74 },
      ],
    },
  ];

  return (
    <section id="sample" className="relative">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <div className="flex flex-col gap-3 text-center">
            <span className="eyebrow">The abstract</span>
            <h2
              className="text-[36px] leading-[1.06] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[52px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A finished abstract — every field, every score.
            </h2>
            <p
              className="mx-auto mt-2 max-w-[640px] text-[16px] leading-[1.6] text-[var(--whisper)] md:text-[18px]"
            >
              Real output from a 47-page mid-market office lease. Twelve of
              thirty fields shown. Two flagged for your review queue.
            </p>
          </div>
        </Reveal>

        <Reveal delay={180} className="mt-14">
          <div
            className="overflow-hidden rounded-[16px] bg-[var(--vellum)]"
            style={{ boxShadow: "var(--shadow-heavy)" }}
          >
            {/* Dossier header */}
            <div
              className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8"
              style={{ borderBottom: "1px solid rgba(26,34,56,0.08)" }}
            >
              <div className="flex items-baseline gap-4">
                <span
                  className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  1200 Brickell Ave · Suite 1700
                </span>
                <span
                  className="hidden text-[12px] text-[var(--whisper)] md:inline"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  LB-2618 · 47 pp · 00:01:24
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--confidence-high)" }}
                />
                <span className="text-[12px] font-medium tracking-[0.08em] text-[var(--ink)] uppercase">
                  Ready · 28 of 30 high-confidence
                </span>
              </div>
            </div>

            {/* Field groups */}
            <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: "rgba(26,34,56,0.06)" }}>
              {groups.map((g) => (
                <div key={g.title} className="bg-[var(--vellum)] px-6 py-6 md:px-8 md:py-7">
                  <div className="flex items-baseline justify-between">
                    <h3
                      className="text-[14px] font-medium tracking-[0.08em] text-[var(--ink)] uppercase"
                    >
                      {g.title}
                    </h3>
                    <span
                      className="text-[12px] text-[var(--whisper)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {g.rows.filter((r) => r.conf >= 0.85).length} / {g.rows.length}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3">
                    {g.rows.map((r) => (
                      <div key={r.name} className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <dt
                            className="text-[11px] tracking-[0.06em] text-[var(--whisper)] uppercase"
                          >
                            {r.name}
                          </dt>
                          <dd
                            className="mt-0.5 truncate text-[14px] text-[var(--ink)]"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {r.value}
                          </dd>
                        </div>
                        <ConfidenceChip conf={r.conf} />
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>

            {/* Review queue strip */}
            <div
              className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8"
              style={{
                borderTop: "1px solid rgba(26,34,56,0.08)",
                background: "rgba(213,154,58,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--review-amber)" }}
                />
                <span
                  className="text-[13px] font-medium text-[var(--ink)]"
                >
                  2 fields routed to your review queue
                </span>
                <span
                  className="text-[12px] text-[var(--whisper)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  option_to_extend · operating_caps
                </span>
              </div>
              <span className="text-[12px] text-[var(--whisper)]">
                Reviewed in-house · never leaves your team.
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ConfidenceChip({ conf }: { conf: number }) {
  const review = conf < 0.85;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11px]"
      style={{
        background: review ? "rgba(213,154,58,0.14)" : "rgba(61,138,90,0.12)",
        color: review ? "var(--review-amber)" : "var(--confidence-high)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: review ? "var(--review-amber)" : "var(--confidence-high)" }}
      />
      {conf.toFixed(2)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing anchor — single $19 plan card with brass border + outsource compare.
// ─────────────────────────────────────────────────────────────────────────────

function PricingAnchor({
  variant,
  onCtaClick,
}: {
  variant: Variant;
  onCtaClick: () => void;
}) {
  return (
    <section id="pricing" className="relative bg-[var(--ink)] text-[var(--parchment)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(200,152,85,0.14), transparent 65%)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <Reveal>
          <div>
            <span
              className="text-[13px] font-medium tracking-[0.08em] uppercase"
              style={{ color: "rgba(247,244,236,0.55)" }}
            >
              The trade
            </span>
            <h2
              className="mt-4 text-[36px] leading-[1.06] font-semibold tracking-[-0.02em] text-[var(--parchment)] md:text-[52px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              One{" "}
              <span
                className="italic"
                style={{ color: "var(--brass)" }}
              >
                $19
              </span>{" "}
              line item replaces your outsource bill.
            </h2>
            <p
              className="mt-6 max-w-[480px] text-[16px] leading-[1.6] md:text-[17px]"
              style={{ color: "rgba(247,244,236,0.7)" }}
            >
              50 abstracts a month included. $5 per abstract after — never
              $200, never $500. No per-page surprises, no overseas tier upsell.
              Cancel any month, keep every exported abstract you ever made.
            </p>

            {/* Compare table */}
            <div className="mt-10 space-y-3">
              <CompareRow
                left="Datapoint / Lease Probe"
                leftSub="Outsourced, per-document"
                right="$200 – $500"
                rightSub="per lease"
              />
              <CompareRow
                left="Visual Lease / Leasecake / MRI"
                leftSub="Enterprise lease admin"
                right="$5,000+"
                rightSub="per month"
              />
              <CompareRow
                left="LeaseBrief"
                leftSub="Per-field AI + in-house review"
                right="$19"
                rightSub="flat / 50 abstracts"
                highlight
              />
            </div>
          </div>
        </Reveal>

        {/* Pricing card */}
        <Reveal delay={180}>
          <div
            className="relative overflow-hidden rounded-[18px] bg-[var(--parchment)] p-8 text-[var(--ink)] md:p-10"
            style={{ boxShadow: "var(--shadow-heavy)" }}
          >
            {/* Brass top edge */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: "var(--brass)" }}
            />
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Pro plan</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] uppercase"
                style={{ background: "rgba(200,152,85,0.16)", color: "#8a6228" }}
              >
                Most popular
              </span>
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span
                className="text-[72px] leading-none font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-[88px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                $19
              </span>
              <span className="text-[16px] font-medium text-[var(--whisper)]">/ month</span>
            </div>
            <p className="mt-2 text-[14px] text-[var(--whisper)]">
              Billed monthly. Cancel any month.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                "50 lease abstracts included each month",
                "$5 per abstract after — never per-page",
                "30-field structured output + per-field confidence",
                "Yardi, MRI, AppFolio Commercial exports",
                "In-house review queue · no outsourced humans",
                "Audit log on every field edit",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-[15px] text-[var(--ink)]">
                  <span className="mt-0.5">
                    <Check />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              onClick={onCtaClick}
              className="group/cta relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brass)] px-6 py-4 text-[15px] font-semibold text-[var(--ink)] transition-all duration-150 hover:shadow-[0_0_0_4px_rgba(200,152,85,0.18),0_12px_28px_rgba(200,152,85,0.32)] active:translate-y-px"
              style={{ boxShadow: "var(--shadow-medium)" }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(26,34,56,0.08)",
                }}
              />
              <span className="relative">{variant.cta}</span>
              <ArrowGlyph className="relative" />
            </Link>
            <p className="mt-4 text-center text-[12px] text-[var(--whisper)]">
              First abstract free · no card required.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CompareRow({
  left,
  leftSub,
  right,
  rightSub,
  highlight,
}: {
  left: string;
  leftSub: string;
  right: string;
  rightSub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-4 py-3"
      style={{
        background: highlight ? "rgba(200,152,85,0.14)" : "rgba(247,244,236,0.06)",
        border: highlight
          ? "1px solid rgba(200,152,85,0.45)"
          : "1px solid rgba(247,244,236,0.08)",
      }}
    >
      <div>
        <div
          className="text-[14px] font-medium"
          style={{ color: highlight ? "var(--parchment)" : "rgba(247,244,236,0.85)" }}
        >
          {left}
        </div>
        <div
          className="text-[12px]"
          style={{ color: "rgba(247,244,236,0.55)" }}
        >
          {leftSub}
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-[16px] font-semibold tabular-nums"
          style={{
            color: highlight ? "var(--brass)" : "var(--parchment)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {right}
        </div>
        <div
          className="text-[12px]"
          style={{ color: "rgba(247,244,236,0.55)" }}
        >
          {rightSub}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — accordion, 4 questions.
// ─────────────────────────────────────────────────────────────────────────────

function Faq() {
  const items = [
    {
      q: "What happens to my client's lease data?",
      a: "Lease PDFs and extracted fields live in your tenant only. They are never shared with another customer, never sent to an outsourced reviewer, and never used to train a model. Low-confidence fields stay in your in-house review queue until your team approves them.",
    },
    {
      q: "How accurate is the 30-field extraction on real CRE leases?",
      a: "On a mid-market office, retail, or industrial lease, the AI returns at least 75% of fields at >= 0.85 confidence — anything below routes to your review queue with a source-page reference. You are never asked to trust a number you cannot audit.",
    },
    {
      q: "Will the export match my Yardi / MRI / AppFolio import?",
      a: "Yes. The Yardi Voyager, MRI Software, and AppFolio Commercial CSVs match each system's column spec exactly. No re-keying, no broken date formats, no \"figure out the rent schedule\" notes.",
    },
    {
      q: "What's actually on the free tier?",
      a: "You get your first lease abstract free with no card on file. After that, the Pro plan is $19/month, 50 abstracts included, $5 per abstract after. Cancel any month — you keep every abstract you exported.",
    },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-[920px] px-6 py-24 md:px-8 md:py-32">
        <Reveal>
          <div className="flex flex-col gap-3 text-center">
            <span className="eyebrow">The questions you actually ask</span>
            <h2
              className="text-[36px] leading-[1.06] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[48px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Answered like a senior associate would.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={140} className="mt-12">
          <Accordion className="w-full">
            {items.map((it, i) => (
              <AccordionItem
                key={it.q}
                value={`faq-${i}`}
                className="border-b border-[rgba(26,34,56,0.08)]"
              >
                <AccordionTrigger
                  className="!py-5 text-left text-[17px] font-medium text-[var(--ink)] md:!py-6 md:text-[19px]"
                >
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
                    {it.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] leading-[1.65] text-[var(--whisper)] md:text-[16px]">
                  {it.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA — full-bleed brass halo, large urgency, repeat the variant CTA.
// ─────────────────────────────────────────────────────────────────────────────

function FinalCta({
  variant,
  onCtaClick,
}: {
  variant: Variant;
  onCtaClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 0%, rgba(200,152,85,0.16), transparent 65%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(200,152,85,0.08), transparent 65%)",
        }}
      />
      <div className="mx-auto max-w-[1000px] px-6 py-24 text-center md:px-8 md:py-36">
        <Reveal>
          <Monogram size={36} />
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <h2
            className="text-[40px] leading-[1.04] font-semibold tracking-[-0.025em] text-[var(--ink)] md:text-[72px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {variant.urgency}
          </h2>
        </Reveal>
        <Reveal delay={200} className="mt-8">
          <p
            className="mx-auto max-w-[620px] text-[17px] leading-[1.55] text-[var(--whisper)] md:text-[19px]"
          >
            Drop your next lease. Get thirty fields back, scored. Push it to
            Yardi. Move on to closing the deal.
          </p>
        </Reveal>
        <Reveal delay={280} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            onClick={onCtaClick}
            className="group/cta relative inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-8 py-4 text-[16px] font-semibold text-[var(--ink)] transition-all duration-150 hover:shadow-[0_0_0_4px_rgba(200,152,85,0.18),0_14px_32px_rgba(200,152,85,0.32)] active:translate-y-px"
            style={{ boxShadow: "var(--shadow-medium)" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(26,34,56,0.06)",
              }}
            />
            <span className="relative">{variant.cta}</span>
            <ArrowGlyph className="relative" />
          </Link>
          <span className="text-[13px] text-[var(--whisper)]">
            90 seconds · first abstract free · no card
          </span>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="relative border-t border-[rgba(26,34,56,0.08)] bg-[var(--parchment)]"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center md:px-8">
        <div className="flex items-center gap-4">
          <Monogram size={24} />
          <span
            className="text-[12px] tracking-[0.06em] text-[var(--whisper)] uppercase"
          >
            LeaseBrief · Commercial lease abstraction
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--whisper)]">
          <Link href="/pricing" className="transition-colors hover:text-[var(--ink)]">
            Pricing
          </Link>
          <Link href="/login" className="transition-colors hover:text-[var(--ink)]">
            Sign in
          </Link>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            © {new Date().getFullYear()} LeaseBrief
          </span>
        </div>
      </div>

      {/* Beam keyframe + ad-hoc utilities */}
      <style>{`
        @keyframes lb-beam {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[lb-beam_2400ms_var\\(--ease-snap\\)_forwards\\] {
            transform: scaleX(1) !important;
            animation: none !important;
          }
        }
      `}</style>
    </footer>
  );
}
