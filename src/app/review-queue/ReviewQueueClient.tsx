"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Inbox,
  PenLine,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { trackReviewFieldEdited } from "@/lib/events";
import {
  CONFIDENCE_THRESHOLD,
  type QueueRow,
} from "./queue-data";

type Filter = "all" | "open" | "resolved";

const FILTER_OPTIONS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
];

interface ReviewQueueClientProps {
  initialRows: ReadonlyArray<QueueRow>;
  emptyStateImagePath: string;
}

export function ReviewQueueClient({
  initialRows,
  emptyStateImagePath,
}: ReviewQueueClientProps) {
  const [rows, setRows] = useState<ReadonlyArray<QueueRow>>(initialRows);
  const [filter, setFilter] = useState<Filter>("open");
  const [expandedId, setExpandedId] = useState<string | null>(
    initialRows.find((r) => !r.reviewer_edited)?.id ?? null,
  );
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showHero, setShowHero] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setShowHero(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  const openCount = useMemo(
    () => rows.filter((r) => !r.reviewer_edited).length,
    [rows],
  );
  const resolvedCount = rows.length - openCount;
  const totalLow = rows.length;
  const resolveProgress = totalLow === 0 ? 1 : resolvedCount / totalLow;

  // Group rows by abstract for editorial structure.
  const filteredRows = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "open"
        ? !r.reviewer_edited
        : r.reviewer_edited,
  );

  const grouped = useMemo(() => {
    const map = new Map<string, QueueRow[]>();
    for (const row of filteredRows) {
      const key = `${row.abstract_id}::${row.abstract_label}`;
      const arr = map.get(key) ?? [];
      arr.push(row);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const [abstract_id, abstract_label] = key.split("::");
      return { abstract_id, abstract_label, items };
    });
  }, [filteredRows]);

  function handleRowKey(
    event: KeyboardEvent<HTMLButtonElement>,
    rowId: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setExpandedId((prev) => (prev === rowId ? null : rowId));
    }
  }

  async function handleSave(row: QueueRow) {
    const newValue = draft[row.id] ?? row.value;
    if (newValue.trim() === "") return;
    setSavingId(row.id);
    // Simulated network latency — feels intentional rather than instant.
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    trackReviewFieldEdited({
      abstract_id: row.abstract_id,
      field_name: row.field_name,
      original_confidence: row.confidence,
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, value: newValue, reviewer_edited: true }
          : r,
      ),
    );
    setSavingId(null);
    // Auto-advance: open the next unresolved row in the same abstract,
    // or collapse if nothing left.
    const nextOpen = rows.find(
      (r) =>
        r.abstract_id === row.abstract_id &&
        r.id !== row.id &&
        !r.reviewer_edited,
    );
    setExpandedId(nextOpen?.id ?? null);
  }

  // Filter pills implemented as a radiogroup per WAI-ARIA contract +
  // roving tabindex (shadcn stack: custom role=radio cluster pattern).
  function rovingTab(index: number): 0 | -1 {
    const activeIdx = FILTER_OPTIONS.findIndex((o) => o.id === filter);
    return activeIdx === index ? 0 : -1;
  }

  function handleFilterKey(
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const last = FILTER_OPTIONS.length - 1;
    let nextIdx: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIdx = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIdx = index === 0 ? last : index - 1;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = FILTER_OPTIONS[nextIdx];
    setFilter(next.id);
    const container = e.currentTarget.parentElement;
    (container?.children[nextIdx] as HTMLElement | undefined)?.focus();
  }

  return (
    <main className="relative min-h-screen bg-[var(--parchment)] pb-32 text-[var(--ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[360px]"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 20% 0%, rgba(213,154,58,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-6 pt-12 md:px-10 md:pt-16">
        {/* Breadcrumb */}
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
          <span className="text-[var(--ink)]">Review queue</span>
        </nav>

        {/* HERO --------------------------------------------------------- */}
        <header
          className={cn(
            "mt-8 grid grid-cols-1 gap-10 transition-all duration-700 ease-[var(--ease-snap)] lg:grid-cols-[1.5fr_1fr]",
            showHero
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-3 opacity-0 blur-[6px]",
          )}
        >
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--ash)]/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--whisper)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--review-amber)]" />
              The Margin · Review Queue
            </span>
            <h1 className="font-display text-[44px] font-semibold leading-[1.04] tracking-[-0.025em] md:text-[52px]">
              Fields the AI flagged for a human read.
            </h1>
            <p className="max-w-2xl text-[17px] leading-[1.55] text-[var(--ink)]/72">
              Every field below scored under{" "}
              <span className="font-mono text-[var(--ink)]">
                {(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%
              </span>{" "}
              confidence across your open abstracts. Confirm or correct each
              value — the queue empties as you go, and edits land back on the
              source abstract with{" "}
              <span className="font-mono text-[var(--ink)]">
                reviewer_edited
              </span>{" "}
              set.
            </p>
          </div>

          {/* Stat panel */}
          <aside
            className="relative h-fit rounded-[14px] border border-[var(--ink)]/8 bg-[var(--vellum)] p-6"
            style={{
              boxShadow:
                "0 0 0 1px rgba(26,34,56,0.05), 0 4px 8px rgba(200,152,85,0.08), 0 8px 16px rgba(26,34,56,0.06)",
            }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
              Queue Status
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display font-mono text-[64px] font-medium leading-none text-[var(--ink)]">
                {openCount}
              </span>
              <span className="font-mono text-sm text-[var(--ink)]/60">
                open · {resolvedCount} resolved
              </span>
            </div>
            <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-[var(--ash)]">
              <div
                className="h-full rounded-full bg-[var(--confidence-high)] transition-[width] duration-[1400ms] ease-[var(--ease-snap)]"
                style={{ width: showHero ? `${resolveProgress * 100}%` : "0%" }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--ink)]/55">
              {resolveProgress === 1
                ? "Every flagged field has been confirmed."
                : `${Math.round(resolveProgress * 100)}% of flagged fields confirmed.`}
            </p>
          </aside>
        </header>

        {/* FILTERS ------------------------------------------------------ */}
        <section className="mt-14">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-display italic text-[var(--ink)]/30 text-lg">
                §
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
                The Queue · Grouped by lease
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Filter review queue"
              className="inline-flex rounded-full border border-[var(--ink)]/10 bg-[var(--vellum)] p-1"
            >
              {FILTER_OPTIONS.map((option, idx) => {
                const active = filter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={rovingTab(idx)}
                    onClick={() => setFilter(option.id)}
                    onKeyDown={(e) => handleFilterKey(e, idx)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-all duration-150 ease-[var(--ease-snap-inout)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vellum)]",
                      active
                        ? "bg-[var(--ink)] text-[var(--parchment)] shadow-[0_4px_8px_-2px_rgba(26,34,56,0.25)]"
                        : "text-[var(--ink)]/65 hover:text-[var(--ink)]",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* QUEUE GROUPS ------------------------------------------------- */}
        <section className="mt-8">
          {grouped.length === 0 ? (
            <EmptyQueueState
              filter={filter}
              emptyStateImagePath={emptyStateImagePath}
              hasOpen={openCount > 0}
              onClearFilter={() => setFilter("all")}
            />
          ) : (
            <div className="space-y-10">
              {grouped.map((group) => (
                <article key={group.abstract_id} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]">
                        Abstract
                      </span>
                      <h2 className="font-display text-[20px] font-medium leading-[1.2] tracking-[-0.015em]">
                        {group.abstract_label}
                      </h2>
                    </div>
                    <Link
                      href={`/abstract/${group.abstract_id}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]/60 underline-offset-4 hover:text-[var(--ink)] hover:underline"
                    >
                      Open abstract
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>

                  <ul className="space-y-2">
                    {group.items.map((row) => {
                      const expanded = expandedId === row.id;
                      const value = draft[row.id] ?? row.value;
                      const isSaving = savingId === row.id;
                      return (
                        <li key={row.id}>
                          <div
                            className={cn(
                              "overflow-hidden rounded-[14px] border bg-[var(--vellum)] transition-all duration-150 ease-[var(--ease-snap-inout)]",
                              row.reviewer_edited
                                ? "border-[var(--confidence-high)]/30"
                                : expanded
                                  ? "border-[var(--review-amber)]/55"
                                  : "border-[var(--ink)]/8",
                            )}
                            style={{
                              boxShadow: row.reviewer_edited
                                ? "0 0 0 1px rgba(61,138,90,0.08), 0 2px 4px rgba(61,138,90,0.04)"
                                : expanded
                                  ? "0 0 0 1px rgba(213,154,58,0.15), 0 4px 12px rgba(213,154,58,0.10)"
                                  : "0 0 0 1px rgba(26,34,56,0.04)",
                            }}
                          >
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={`${row.id}-editor`}
                              onClick={() =>
                                setExpandedId(expanded ? null : row.id)
                              }
                              onKeyDown={(e) => handleRowKey(e, row.id)}
                              className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--ink)]/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)]"
                            >
                              {/* Status dot */}
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "inline-block h-2 w-2 shrink-0 rounded-full",
                                  row.reviewer_edited
                                    ? "bg-[var(--confidence-high)]"
                                    : "bg-[var(--review-amber)]",
                                )}
                              />
                              {/* Field name */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-3">
                                  <span className="truncate font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--whisper)]">
                                    {row.category}
                                  </span>
                                  <span className="truncate font-display text-[16px] font-medium text-[var(--ink)]">
                                    {row.field_name}
                                  </span>
                                </div>
                                <p className="mt-1 truncate font-mono text-[13px] text-[var(--ink)]/72">
                                  {row.value}
                                </p>
                              </div>
                              {/* Confidence */}
                              <span
                                className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-mono text-[11px] font-medium"
                                style={
                                  row.reviewer_edited
                                    ? {
                                        color: "var(--confidence-high)",
                                        backgroundColor: "rgba(61,138,90,0.10)",
                                        boxShadow:
                                          "0 0 0 1px rgba(61,138,90,0.25)",
                                      }
                                    : {
                                        color: "var(--review-amber)",
                                        backgroundColor:
                                          "rgba(213,154,58,0.10)",
                                        boxShadow:
                                          "0 0 0 1px rgba(213,154,58,0.30)",
                                      }
                                }
                              >
                                {(row.confidence * 100).toFixed(0)}%
                              </span>
                              {/* Source page */}
                              {row.source_page !== null ? (
                                <span className="hidden items-center gap-1 font-mono text-[11px] text-[var(--ink)]/50 md:inline-flex">
                                  <FileText className="h-3 w-3" aria-hidden="true" />
                                  p.{row.source_page}
                                </span>
                              ) : null}
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 text-[var(--ink)]/40 transition-transform duration-200 ease-[var(--ease-snap-inout)]",
                                  expanded ? "rotate-180" : "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </button>

                            {/* Editor */}
                            {expanded ? (
                              <div
                                id={`${row.id}-editor`}
                                className="border-t border-[var(--ink)]/8 bg-[var(--parchment)]/40 px-5 py-4"
                              >
                                <label
                                  htmlFor={`${row.id}-input`}
                                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--whisper)]"
                                >
                                  Confirm or correct value
                                </label>
                                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                                  <Input
                                    id={`${row.id}-input`}
                                    value={value}
                                    onChange={(e) =>
                                      setDraft((prev) => ({
                                        ...prev,
                                        [row.id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 rounded-[10px] border-[var(--ink)]/12 bg-[var(--vellum)] font-mono text-base text-[var(--ink)]"
                                    placeholder="Enter the corrected value"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => handleSave(row)}
                                    disabled={isSaving}
                                    className="rounded-full bg-[var(--brass)] px-5 py-2 font-medium text-[var(--ink)] hover:bg-[var(--brass)] hover:opacity-90"
                                    aria-label={
                                      isSaving
                                        ? "Saving field"
                                        : `Save ${row.field_name}`
                                    }
                                  >
                                    {isSaving ? (
                                      <span className="inline-flex items-center gap-2">
                                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)]" />
                                        Saving…
                                      </span>
                                    ) : row.reviewer_edited ? (
                                      <span className="inline-flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                        Re-save
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-2">
                                        <PenLine className="h-4 w-4" aria-hidden="true" />
                                        Confirm value
                                      </span>
                                    )}
                                  </Button>
                                </div>
                                <p className="mt-3 text-xs text-[var(--ink)]/55">
                                  Original AI confidence:{" "}
                                  <span className="font-mono">
                                    {(row.confidence * 100).toFixed(0)}%
                                  </span>
                                  . On save, the field is written back to the
                                  source abstract with{" "}
                                  <span className="font-mono">
                                    reviewer_edited = true
                                  </span>
                                  .
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <Separator className="my-16 bg-[var(--ink)]/8" />

        {/* FORWARD CTA — terminal page action */}
        <footer className="flex flex-col items-start gap-4 border-t border-[var(--ink)]/8 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)]">
              {openCount === 0
                ? "Queue is clean."
                : `${openCount} field${openCount === 1 ? "" : "s"} still need a human read.`}
            </p>
            <p className="text-[15px] text-[var(--ink)]/70">
              {openCount === 0
                ? "Every flagged field has been confirmed. Approve the abstract to lock the record."
                : "Edits save back to the parent abstract immediately."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-lg border-[var(--ink)]/15 bg-transparent px-5 py-2.5 text-[var(--ink)] hover:bg-[var(--ink)]/[0.04]",
            )}
          >
            Back to dashboard
            <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </main>
  );
}

/* ───────────────────────────────────────────────────────────── */
/* Empty queue state                                               */
/* ───────────────────────────────────────────────────────────── */

function EmptyQueueState({
  filter,
  emptyStateImagePath,
  hasOpen,
  onClearFilter,
}: {
  filter: Filter;
  emptyStateImagePath: string;
  hasOpen: boolean;
  onClearFilter: () => void;
}) {
  const isSvg = emptyStateImagePath.endsWith(".svg");

  let headline = "The queue is clear.";
  let body =
    "Every field across your open abstracts has been confirmed. New flagged fields will appear here as soon as the AI runs an extraction below 85% confidence.";
  if (filter === "resolved" && !hasOpen) {
    headline = "Nothing resolved yet.";
    body =
      "Fields you confirm or correct will move here. Switch back to Open to see what still needs a human read.";
  } else if (filter === "open" && !hasOpen) {
    headline = "No open fields.";
    body =
      "Every flagged field has been confirmed. Switch to All to see your full review history.";
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-[18px] border border-[var(--ink)]/8 bg-[var(--vellum)] px-8 py-14 text-center"
      style={{
        boxShadow:
          "0 0 0 1px rgba(26,34,56,0.04), 0 4px 12px rgba(200,152,85,0.06)",
      }}
    >
      <div className="relative mb-6 h-[180px] w-[180px]">
        {isSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={emptyStateImagePath}
            alt=""
            aria-hidden="true"
            className="h-full w-full opacity-90"
          />
        ) : (
          <Image
            src={emptyStateImagePath}
            alt=""
            aria-hidden="true"
            fill
            sizes="180px"
            className="rounded-[14px] object-cover"
          />
        )}
      </div>
      <span className="font-display italic text-[var(--brass)] text-2xl leading-none">
        ¶
      </span>
      <h2 className="mt-4 font-display text-[28px] font-medium leading-[1.15] tracking-[-0.02em]">
        {headline}
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-[1.55] text-[var(--ink)]/65">
        {body}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {filter !== "all" ? (
          <Button
            variant="outline"
            type="button"
            onClick={onClearFilter}
            className="rounded-lg border-[var(--ink)]/15 bg-transparent px-5 py-2 text-[var(--ink)] hover:bg-[var(--ink)]/[0.04]"
          >
            <Inbox className="mr-1.5 h-4 w-4" aria-hidden="true" />
            View all fields
          </Button>
        ) : null}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brass)] px-5 py-2 font-medium text-[var(--ink)] shadow-[0_1px_0_inset_rgba(255,255,255,0.18),0_8px_16px_-4px_rgba(200,152,85,0.40)] transition-all duration-150 ease-[var(--ease-snap-inout)] hover:-translate-y-0.5"
        >
          Abstract another lease
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
