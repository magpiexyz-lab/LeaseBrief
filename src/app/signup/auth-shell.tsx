"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-mark";

/**
 * AuthShell — editorial split-pane shared by /signup and /login.
 *
 * Left pane: dossier-grade brand panel (parchment + brass underline beneath the
 * LB monogram, eyebrow caption, Fraunces headline, lede, proof points stamped
 * with a brass `§` mark). Right pane: vellum card containing the form, with a
 * hairline brass top edge as a "signed" treatment.
 *
 * Stacks vertically on mobile; side-by-side from md+ with the form taking the
 * fixed-width right column so long screens do not stretch the inputs.
 */
export function AuthShell({
  eyebrow,
  headline,
  lede,
  proofPoints,
  footer,
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  lede: ReactNode;
  proofPoints: string[];
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--parchment)] text-[var(--ink)]">
      {/* Atmospheric: brass radial halo upper-right, ink halo lower-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 92% -10%, rgba(200,152,85,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at -10% 110%, rgba(26,34,56,0.06), transparent 60%)",
        }}
      />
      {/* Subtle paper grain texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.10 0 0 0 0 0.13 0 0 0 0 0.22 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* -------------------- Brand panel (left) -------------------- */}
        <aside className="relative flex flex-col justify-between px-6 pt-10 pb-8 sm:px-10 md:px-14 lg:px-16 lg:pt-16 lg:pb-12">
          <BrandMark />

          <div className="my-12 max-w-xl lg:my-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--whisper)]">
              {eyebrow}
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {headline}
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-[1.55] text-[var(--whisper)]">
              {lede}
            </p>

            <ul className="mt-10 space-y-4">
              {proofPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-[15px] leading-[1.55] text-[var(--ink)]/85"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-[var(--brass)]/15 font-display text-sm italic text-[var(--brass)]"
                  >
                    §
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

        </aside>

        {/* -------------------- Form panel (right) -------------------- */}
        <section className="relative flex items-start justify-center px-6 pt-2 pb-16 sm:px-10 md:px-12 lg:items-center lg:pt-16">
          <div className="relative w-full max-w-[440px]">
            {/* Hairline brass top-edge — the "signed" treatment */}
            <div
              aria-hidden
              className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[var(--brass)] to-transparent"
            />
            <div
              className="relative rounded-[14px] border border-[var(--ash)] bg-[var(--card)] p-7 sm:p-9"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(26,34,56,0.04), 0 4px 8px rgba(200,152,85,0.10), 0 16px 40px rgba(26,34,56,0.08)",
              }}
            >
              {children}

              {footer && (
                <div className="mt-8 border-t border-[var(--ash)] pt-6">
                  {footer}
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * BrandMark — Fraunces "LB" monogram with hairline brass underline.
 * Asymmetric (B slightly larger / offset) per the visual brief logo direction.
 */
function BrandMark() {
  return (
    <Link
      href="/"
      className="inline-flex self-start"
      aria-label="LeaseBrief home"
    >
      <BrandLockup monogramSize={32} wordmarkSize={20} />
    </Link>
  );
}
