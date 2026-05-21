"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  trackAbstractCompleted,
  trackAbstractExported,
  trackAbstractView,
  trackCheckoutStarted,
} from "@/lib/events";
import type { AbstractRow } from "@/lib/types";
import {
  CONFIDENCE_THRESHOLD,
  type FieldCategory,
} from "./demo-data";

type ExportFormat = "yardi" | "mri" | "appfolio";

const EXPORT_FORMATS: ReadonlyArray<{
  id: ExportFormat;
  label: string;
  caption: string;
}> = [
  { id: "yardi", label: "Yardi Voyager", caption: "CSV — Voyager Commercial schema." },
  { id: "mri", label: "MRI Software", caption: "CSV — MRI commercial import." },
  { id: "appfolio", label: "AppFolio Commercial", caption: "CSV — AppFolio CRE intake." },
];

type ApprovalState = "draft" | "approving" | "approved";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function relTime(iso: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function confidenceTone(c: number): "high" | "low" {
  return c >= CONFIDENCE_THRESHOLD ? "high" : "low";
}

interface AbstractDetailViewProps {
  abstract: AbstractRow;
  categories: ReadonlyArray<FieldCategory>;
  premisesTitle: string;
  emptyStateImagePath: string;
}

export function AbstractDetailView({
  abstract,
  categories,
  premisesTitle,
  emptyStateImagePath,
}: AbstractDetailViewProps) {
  const allFields = useMemo(
    () => categories.flatMap((c) => c.fields),
    [categories],
  );
  const totalFields = allFields.length;
  const lowConfidenceFields = useMemo(
    () => allFields.filter((f) => f.confidence < CONFIDENCE_THRESHOLD),
    [allFields],
  );
  const highConfidenceCount = totalFields - lowConfidenceFields.length;
  const highConfidenceShare = highConfidenceCount / Math.max(1, totalFields);
  const reviewerEditedCount = allFields.filter((f) => f.reviewer_edited).length;

  const [approvalState, setApprovalState] = useState<ApprovalState>(
    abstract.status === "approved" ? "approved" : "draft",
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [lastExport, setLastExport] = useState<ExportFormat | null>(null);
  const [showHero, setShowHero] = useState(false);

  // abstract_view fires once on mount with extraction_duration_ms — b-05.
  useEffect(() => {
    trackAbstractView({
      abstract_id: abstract.id,
      extraction_duration_ms: abstract.extraction_duration_ms ?? undefined,
    });
    // Staggered hero reveal (visual brief: BlurFade-style 80ms stagger).
    const t = window.setTimeout(() => setShowHero(true), 40);
    return () => window.clearTimeout(t);
  }, [abstract.id, abstract.extraction_duration_ms]);

  async function handleApprove() {
    if (approvalState !== "draft") return;
    setApprovalState("approving");
    // Brief simulated latency so the user sees the choreography.
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    trackAbstractCompleted({
      abstract_id: abstract.id,
      review_fields_edited: reviewerEditedCount,
      extraction_duration_ms: abstract.extraction_duration_ms ?? undefined,
    });
    setApprovalState("approved");
  }

  function handleExport(format: ExportFormat) {
    trackAbstractExported({
      abstract_id: abstract.id,
      format,
      plan_at_export: "free",
    });
    setLastExport(format);
    setExportOpen(false);
  }

  function handleUpgrade() {
    trackCheckoutStarted({
      abstract_count_at_upgrade: 1,
      variant: "speed",
    });
  }

  return (
    <main className="relative min-h-screen bg-[var(--parchment)] pb-32 text-[var(--ink)]">
      {/* Atmospheric brass halo — matches landing/hero treatment per visual brief */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 0%, rgba(200,152,85,0.10), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-6 pt-12 md:px-10 md:pt-16">
        {/* Breadcrumb / context strip */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--whisper)]"
        >
          <Link
            href="/dashboard"
            className="transition-opacity duration-150 ease-[var(--ease-snap)] hover:opacity-70"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="text-[var(--ink)]/60">Abstract</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="font-mono normal-case tracking-normal text-[var(--ink)]">
            {abstract.id}
          </span>
        </nav>

        {/* HERO BLOCK ----------------------------------------------------- */}
        <header
          className={cn(
            "mt-8 grid grid-cols-1 gap-10 transition-all duration-700 ease-[var(--ease-snap)] lg:grid-cols-[1.4fr_1fr]",
            showHero
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-3 opacity-0 blur-[6px]",
          )}
        >
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ash)]/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--whisper)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brass)]" />
              The Abstract · 30 Fields
            </span>
            <h1 className="font-display text-[44px] font-semibold leading-[1.04] tracking-[-0.025em] md:text-[56px]">
              {premisesTitle}
            </h1>
            <p className="max-w-2xl text-[17px] leading-[1.55] text-[var(--ink)]/72">
              Extracted{" "}
              <span className="font-mono text-[var(--ink)]">
                {relTime(abstract.created_at)}
              </span>{" "}
              in{" "}
              <span className="font-mono text-[var(--ink)]">
                {abstract.extraction_duration_ms
                  ? (abstract.extraction_duration_ms / 1000).toFixed(1)
                  : "—"}
                s
              </span>
              . Review the 30 fields below, edit any flagged for low
              confidence, then approve to lock the abstract and unlock
              one-click export to Yardi, MRI, or AppFolio Commercial.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Primary CTA — Approve Abstract (Brass pill, signature CTA) */}
              {approvalState !== "approved" ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approvalState === "approving"}
                  className={cn(
                    "group/cta inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-6 py-3 font-medium text-[var(--ink)]",
                    "shadow-[0_1px_0_inset_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(200,152,85,0.40)]",
                    "transition-all duration-150 ease-[var(--ease-snap-inout)]",
                    "hover:-translate-y-0.5 hover:shadow-[0_1px_0_inset_rgba(255,255,255,0.20),0_12px_24px_-4px_rgba(200,152,85,0.55)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--parchment)]",
                    "disabled:opacity-70",
                  )}
                  aria-label="Approve abstract and lock all 30 fields"
                >
                  {approvalState === "approving" ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)]" />
                      <span>Approving…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>Approve Abstract</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--confidence-high)]/30 bg-[var(--confidence-high)]/10 px-5 py-2.5 font-medium text-[var(--confidence-high)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Approved
                </span>
              )}

              {/* Export menu — Yardi / MRI / AppFolio */}
              <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogTrigger
                  render={(props) => (
                    <button
                      type="button"
                      {...props}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink)]/15 bg-transparent px-5 py-2.5 text-[14px] font-medium text-[var(--ink)] transition-all duration-150 ease-[var(--ease-snap-inout)] hover:bg-[var(--ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--parchment)]"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export
                      {lastExport ? (
                        <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--confidence-high)]" />
                      ) : null}
                    </button>
                  )}
                />
                <DialogContent className="bg-[var(--vellum)]">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">
                      Export to your system of record
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-[var(--ink)]/70">
                    The abstract will be formatted to the column spec of your
                    target platform. Free tier includes 3 exports per
                    abstract.
                  </p>
                  <div className="mt-2 space-y-2">
                    {EXPORT_FORMATS.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleExport(fmt.id)}
                        className={cn(
                          "group flex w-full items-start justify-between gap-4 rounded-[10px] border border-[var(--ink)]/8 bg-[var(--parchment)] px-4 py-3 text-left",
                          "transition-all duration-150 ease-[var(--ease-snap-inout)]",
                          "hover:-translate-y-[1px] hover:border-[var(--brass)]/40 hover:shadow-[0_4px_12px_-4px_rgba(200,152,85,0.20)]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)] focus-visible:ring-offset-2",
                        )}
                      >
                        <div>
                          <div className="font-medium text-[var(--ink)]">
                            {fmt.label}
                          </div>
                          <div className="mt-0.5 text-[13px] text-[var(--ink)]/65">
                            {fmt.caption}
                          </div>
                        </div>
                        <Download className="mt-1 h-4 w-4 text-[var(--ink)]/40 transition-colors group-hover:text-[var(--brass)]" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  {lastExport ? (
                    <p
                      role="status"
                      aria-live="polite"
                      className="mt-2 rounded-md bg-[var(--confidence-high)]/8 px-3 py-2 text-xs text-[var(--confidence-high)]"
                    >
                      Last exported as{" "}
                      <span className="font-mono">{lastExport}</span> · format
                      saved.
                    </p>
                  ) : null}
                </DialogContent>
              </Dialog>

              {lowConfidenceFields.length > 0 ? (
                <Link
                  href="/review-queue"
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--ink)] underline-offset-4 hover:underline"
                >
                  Review {lowConfidenceFields.length} flagged{" "}
                  {lowConfidenceFields.length === 1 ? "field" : "fields"}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>

          {/* Confidence summary card — right-side dossier panel */}
          <aside
            className="relative h-fit rounded-[14px] border border-[var(--ink)]/8 bg-[var(--vellum)] p-6"
            style={{
              boxShadow:
                "0 0 0 1px rgba(26,34,56,0.05), 0 4px 8px rgba(200,152,85,0.08), 0 8px 16px rgba(26,34,56,0.06)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                Confidence Summary
              </span>
              <span className="font-mono text-[11px] text-[var(--whisper)]">
                ID · {abstract.id}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-mono text-[64px] font-medium leading-none text-[var(--ink)]">
                  {pct(highConfidenceShare)}
                </span>
                <span className="font-mono text-sm text-[var(--ink)]/60">
                  high
                </span>
              </div>

              {/* Confidence beam — signature element from visual brief */}
              <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-[var(--ash)]">
                <div
                  className="h-full rounded-full bg-[var(--brass)] transition-[width] duration-[1400ms] ease-[var(--ease-snap)]"
                  style={{ width: showHero ? `${highConfidenceShare * 100}%` : "0%" }}
                />
              </div>
            </div>

            <Separator className="my-5 bg-[var(--ink)]/8" />

            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                  Total Fields
                </dt>
                <dd className="mt-1 font-mono text-lg text-[var(--ink)]">
                  {totalFields}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                  Flagged (&lt; {pct(CONFIDENCE_THRESHOLD)})
                </dt>
                <dd className="mt-1 font-mono text-lg text-[var(--review-amber)]">
                  {lowConfidenceFields.length}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                  Extraction
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 font-mono text-sm text-[var(--ink)]">
                  <Clock className="h-3 w-3 text-[var(--ink)]/50" aria-hidden="true" />
                  {abstract.extraction_duration_ms
                    ? `${(abstract.extraction_duration_ms / 1000).toFixed(1)}s`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                  Status
                </dt>
                <dd className="mt-1 font-mono text-sm capitalize text-[var(--ink)]">
                  {approvalState === "approved" ? "approved" : abstract.status}
                </dd>
              </div>
            </dl>
          </aside>
        </header>

        {/* PROGRESS RAIL --------------------------------------------------- */}
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display italic text-[var(--ink)]/30 text-lg">
                §
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                Extraction Yield · h-02
              </span>
            </div>
            <span className="font-mono text-xs text-[var(--ink)]/55">
              {highConfidenceCount} / {totalFields} fields above{" "}
              {pct(CONFIDENCE_THRESHOLD)} confidence
            </span>
          </div>
          <Progress
            value={highConfidenceShare * 100}
            className="mt-3 h-1.5 bg-[var(--ash)] [&>div]:bg-[var(--brass)]"
          />
        </section>

        {/* FIELD GROUPS --------------------------------------------------- */}
        <section className="mt-14 space-y-12">
          {categories.map((category, idx) => (
            <FieldCategoryBlock
              key={category.id}
              category={category}
              orderIndex={idx}
            />
          ))}
        </section>

        <Separator className="my-16 bg-[var(--ink)]/8" />

        {/* UPGRADE BAND ---------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-[18px] border border-[var(--ink)]/8 bg-[var(--vellum)] p-8 md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at center, rgba(200,152,85,0.18), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                The Trade · $399 / mo
              </span>
              <h2 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] md:text-[32px]">
                Run 50 abstracts every month. $5 each after.
              </h2>
              <p className="text-[15px] text-[var(--ink)]/72">
                Outsourced abstracts run{" "}
                <span className="font-mono text-[var(--ink)]">$200–500</span>{" "}
                per document. Replace that line item with one $399 / mo
                subscription and unlock unlimited exports across Yardi, MRI,
                and AppFolio Commercial.
              </p>
            </div>
            <Link
              href="/pricing"
              onClick={handleUpgrade}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3 font-medium text-[var(--parchment)] shadow-[0_8px_16px_-4px_rgba(26,34,56,0.30)] transition-all duration-150 ease-[var(--ease-snap-inout)] hover:-translate-y-0.5 hover:bg-[var(--ink)]/92"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Upgrade to Pro
            </Link>
          </div>
        </section>

        {/* APPROVED STATE FOOTER ------------------------------------------ */}
        {approvalState === "approved" ? (
          <ApprovedConfirmation
            emptyStateImagePath={emptyStateImagePath}
            onExport={() => setExportOpen(true)}
          />
        ) : null}

        {/* FORWARD CTA — final golden_path step terminus */}
        <footer className="mt-20 flex flex-col items-start gap-4 border-t border-[var(--ink)]/8 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
              Done with this lease?
            </p>
            <p className="text-[15px] text-[var(--ink)]/70">
              Drop the next PDF, or open the review queue to clean up flagged
              fields across all your abstracts.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/review-queue"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-lg border-[var(--ink)]/15 bg-transparent px-5 py-2.5 text-[var(--ink)] hover:bg-[var(--ink)]/[0.04]",
              )}
            >
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Open Review Queue
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-6 py-2.5 font-medium text-[var(--ink)] shadow-[0_1px_0_inset_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(200,152,85,0.40)] transition-all duration-150 ease-[var(--ease-snap-inout)] hover:-translate-y-0.5"
            >
              Abstract another lease
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Field category block                                            */
/* ───────────────────────────────────────────────────────────── */

function FieldCategoryBlock({
  category,
  orderIndex,
}: {
  category: FieldCategory;
  orderIndex: number;
}) {
  const lowCount = category.fields.filter(
    (f) => f.confidence < CONFIDENCE_THRESHOLD,
  ).length;
  const eyebrowNumber = String(orderIndex + 1).padStart(2, "0");

  return (
    <article className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      {/* Category header — left rail, editorial */}
      <header className="space-y-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--brass)]">
          § {eyebrowNumber}
        </span>
        <h2 className="font-display text-[22px] font-medium leading-[1.15] tracking-[-0.015em]">
          {category.label}
        </h2>
        <p className="text-[14px] leading-[1.55] text-[var(--ink)]/60">
          {category.caption}
        </p>
        {lowCount > 0 ? (
          <Badge
            variant="outline"
            className="border-[var(--review-amber)]/40 bg-[var(--review-amber)]/8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--review-amber)]"
          >
            {lowCount} flagged
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-[var(--confidence-high)]/30 bg-[var(--confidence-high)]/8 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--confidence-high)]"
          >
            All confident
          </Badge>
        )}
      </header>

      {/* Field grid — 2-column desktop, 1-column mobile */}
      <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {category.fields.map((field) => {
          const tone = confidenceTone(field.confidence);
          return (
            <div
              key={field.field_name}
              className={cn(
                "group relative rounded-[14px] border bg-[var(--vellum)] p-4 transition-all duration-150 ease-[var(--ease-snap-inout)]",
                "hover:-translate-y-[1px]",
                tone === "low"
                  ? "border-[var(--review-amber)]/35 hover:border-[var(--review-amber)]/55"
                  : "border-[var(--ink)]/8 hover:border-[var(--ink)]/16",
              )}
              style={{
                boxShadow:
                  tone === "low"
                    ? "0 0 0 1px rgba(213,154,58,0.10), 0 2px 4px rgba(213,154,58,0.06)"
                    : "0 0 0 1px rgba(26,34,56,0.04), 0 2px 4px rgba(200,152,85,0.04)",
              }}
            >
              {/* Brass / amber hairline at top — confidence beam motif */}
              <div
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-4 top-0 h-[2px] rounded-full",
                  tone === "low" ? "bg-[var(--review-amber)]/50" : "bg-[var(--brass)]/55",
                )}
              />
              <div className="flex items-start justify-between gap-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--whisper)]">
                  {field.field_name}
                </dt>
                <ConfidenceChip confidence={field.confidence} />
              </div>
              <dd className="mt-2 font-mono text-[15px] leading-[1.4] text-[var(--ink)]">
                {field.value ?? <span className="text-[var(--ink)]/40">—</span>}
                {field.source_page !== null && field.source_page !== undefined ? (
                  <span className="ml-2 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink)]/45">
                    <FileText className="h-3 w-3" aria-hidden="true" />
                    p.{field.source_page}
                  </span>
                ) : null}
                {field.reviewer_edited ? (
                  <span className="ml-2 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--confidence-high)]">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    reviewed
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Confidence chip                                                 */
/* ───────────────────────────────────────────────────────────── */

function ConfidenceChip({ confidence }: { confidence: number }) {
  const tone = confidenceTone(confidence);
  const color = tone === "high" ? "var(--confidence-high)" : "var(--review-amber)";
  const label = tone === "high" ? "high" : "review";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-mono text-[11px] font-medium"
      style={{
        color,
        backgroundColor: `${tone === "high" ? "rgba(61,138,90," : "rgba(213,154,58,"}0.10)`,
        boxShadow: `0 0 0 1px ${color === "var(--confidence-high)" ? "rgba(61,138,90,0.25)" : "rgba(213,154,58,0.30)"}`,
      }}
      aria-label={`Confidence ${(confidence * 100).toFixed(0)} percent, ${label}`}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {(confidence * 100).toFixed(0)}% · {label}
    </span>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Approved confirmation                                           */
/* ───────────────────────────────────────────────────────────── */

function ApprovedConfirmation({
  emptyStateImagePath,
  onExport,
}: {
  emptyStateImagePath: string;
  onExport: () => void;
}) {
  const isSvg = emptyStateImagePath.endsWith(".svg");
  return (
    <section
      className="mt-12 overflow-hidden rounded-[18px] border border-[var(--confidence-high)]/25 bg-[var(--confidence-high)]/6"
      role="region"
      aria-label="Abstract approved"
    >
      <div className="grid grid-cols-1 items-center gap-6 p-8 md:grid-cols-[1fr_auto] md:p-10">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--confidence-high)]/12 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--confidence-high)]">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Approved · locked
          </span>
          <h3 className="font-display text-[24px] font-medium leading-[1.15]">
            Abstract is finalized. Ready to ship to your system of record.
          </h3>
          <p className="text-[14px] text-[var(--ink)]/70">
            Export to Yardi, MRI, or AppFolio Commercial whenever you need
            it. The abstract stays in your dashboard for the lifetime of the
            lease.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-[14px] font-medium text-[var(--parchment)] transition-all duration-150 ease-[var(--ease-snap-inout)] hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export now
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--ink)] underline-offset-4 hover:underline"
            >
              Back to dashboard
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hidden md:block">
          {isSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emptyStateImagePath}
              alt=""
              aria-hidden="true"
              className="h-[140px] w-[140px] opacity-80"
            />
          ) : (
            <Image
              src={emptyStateImagePath}
              alt=""
              aria-hidden="true"
              width={140}
              height={140}
              className="rounded-[12px] opacity-80"
            />
          )}
        </div>
      </div>
    </section>
  );
}
