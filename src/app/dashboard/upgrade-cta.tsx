"use client";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export function UpgradeCta({
  abstractCount,
  variant: _variantSlug,
}: {
  abstractCount: number;
  variant?: string;
}) {
  return (
    <section
      aria-labelledby="dashboard-upgrade-heading"
      className="relative overflow-hidden rounded-[14px] bg-card p-6 ring-1 ring-[oklch(0.22_0.04_250_/_0.10)]"
    >
      {/* Brass halo + paper-grain accent layered behind content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 80% at 100% 0%, rgba(200,152,85,0.16), transparent 65%), radial-gradient(ellipse 50% 60% at 0% 100%, rgba(26,34,56,0.05), transparent 65%)",
        }}
      />
      {/* Brass corner ribbon — restrained, like a wax seal */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 inline-flex h-7 items-center gap-1 rounded-bl-[14px] bg-[var(--brass)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]"
      >
        Upgrade
      </span>

      <div className="relative flex flex-col gap-4">
        <p className="eyebrow">The Trade</p>
        <h3
          id="dashboard-upgrade-heading"
          className="font-display text-[26px] font-medium leading-[1.1] tracking-tight text-foreground md:text-[28px]"
        >
          Replace your{" "}
          <span className="italic text-[var(--brass)]">$200–500 / lease</span> outsourcer bill with
          one $19 line item.
        </h3>
        <p className="max-w-2xl text-[15px] leading-[1.55] text-muted-foreground">
          Unlock unlimited extraction speed, the full review queue, and exports to Yardi, MRI, and
          AppFolio Commercial. 50 abstracts included monthly · <span className="font-mono">$5</span>{" "}
          per overage · cancel any month.
        </p>

        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PricePill label="Plan" value="Pro" mono={false} accent />
          <PricePill label="Monthly" value="$19" />
          <PricePill label="Overage / lease" value="$5" />
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <p className="text-[13px] text-foreground/70">
            Self-serve checkout opens soon. Drop your work email below and
            we&apos;ll let you know the moment Pro goes live.
          </p>
          <WaitlistForm
            source="dashboard"
            abstractCount={abstractCount}
            ctaLabel="Notify me"
          />
          <Link
            href="/pricing"
            className="rounded-md px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            See the full pricing memo →
          </Link>
        </div>

        <p className="text-[12px] text-muted-foreground">
          Reference: outsourced abstracts run $200–$500 each. One Pro month is cheaper than one
          outsourced abstract.
        </p>
      </div>
    </section>
  );
}

function PricePill({
  label,
  value,
  mono = true,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-1 rounded-[10px] px-4 py-3 ring-1",
        accent
          ? "bg-[oklch(0.97_0.04_85)] ring-[oklch(0.72_0.13_75_/_0.30)]"
          : "bg-[var(--parchment)] ring-[oklch(0.22_0.04_250_/_0.08)]",
      ].join(" ")}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={[
          "font-display text-[22px] font-medium leading-none text-foreground",
          mono ? "font-mono text-[22px]" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
