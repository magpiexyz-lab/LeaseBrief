"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackCheckoutStarted } from "@/lib/events";
import { Button } from "@/components/ui/button";

export function UpgradeCta({
  abstractCount,
  variant: variantSlug,
}: {
  abstractCount: number;
  variant?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function handleUpgrade() {
    setError("");
    trackCheckoutStarted({
      abstract_count_at_upgrade: abstractCount,
      ...(variantSlug ? { variant: variantSlug } : {}),
    });

    startTransition(async () => {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "pro" }),
        });
        if (res.ok) {
          const payload = (await res.json().catch(() => null)) as { url?: string } | null;
          if (payload?.url) {
            window.location.assign(payload.url);
            return;
          }
        }
        // Fallback when /api/checkout is a stub — keep the funnel moving by routing to /checkout.
        router.push("/checkout");
      } catch {
        setError("Could not reach checkout. Try again or use the pricing page.");
      }
    });
  }

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
          one $399 line item.
        </h3>
        <p className="max-w-2xl text-[15px] leading-[1.55] text-muted-foreground">
          Unlock unlimited extraction speed, the full review queue, and exports to Yardi, MRI, and
          AppFolio Commercial. 50 abstracts included monthly · <span className="font-mono">$5</span>{" "}
          per overage · cancel any month.
        </p>

        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PricePill label="Plan" value="Pro" mono={false} accent />
          <PricePill label="Monthly" value="$399" />
          <PricePill label="Overage / lease" value="$5" />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleUpgrade}
            disabled={isPending}
            className="h-11 rounded-full bg-[var(--brass)] px-6 text-[14px] font-medium text-[var(--ink)] shadow-[var(--shadow-medium)] transition-all hover:bg-[var(--brass)]/90 hover:shadow-[var(--shadow-heavy)]"
          >
            {isPending ? "Opening secure checkout..." : "Upgrade to Pro"}
          </Button>
          <Link
            href="/pricing"
            className="rounded-md px-2 py-1 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            See the full pricing memo →
          </Link>
        </div>

        <p className="text-[12px] text-muted-foreground">
          Reference: outsourced abstracts run $200–$500 each. Pro pays for itself at 1.3 abstracts /
          month.
        </p>

        {error && (
          <p role="alert" className="text-[12px] text-destructive">
            {error}
          </p>
        )}
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
