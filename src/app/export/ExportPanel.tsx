"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackAbstractExported } from "@/lib/events";
import {
  FORMAT_SPECS,
  FREE_EXPORT_LIMIT,
  type ExportFormat,
} from "./columns";

// Roving-tabindex helpers per shadcn stack rules for custom role="radio"
// clusters. ONE option is in the natural tab order; Arrow/Home/End move
// focus AND select (matches native <input type="radio"> semantics).
function rovingTabIndex<T extends string>(
  values: ReadonlyArray<T>,
  current: T,
  index: number,
): 0 | -1 {
  return values[index] === current ? 0 : -1;
}

function handleRadioGroupKey<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  values: ReadonlyArray<T>,
  current: T,
  onChange: (v: T) => void,
): void {
  const last = values.length - 1;
  if (last < 0) return;
  const currentIdx = Math.max(0, values.indexOf(current));
  let nextIdx: number;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIdx = currentIdx === last ? 0 : currentIdx + 1;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      nextIdx = currentIdx === 0 ? last : currentIdx - 1;
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
  event.preventDefault();
  onChange(values[nextIdx]);
  const container = (event.currentTarget as HTMLElement).parentElement;
  (container?.children[nextIdx] as HTMLElement | undefined)?.focus();
}

type Props = {
  abstractId: string;
  abstractTitle: string;
  plan: "free" | "pro";
  existingExportCount: number;
  fieldCount: number;
};

type DownloadState = "idle" | "downloading" | "success" | "error";

const FORMAT_ORDER: ReadonlyArray<ExportFormat> = ["yardi", "mri", "appfolio"];

// The "watermark" path. In production, the route handler appends a
// watermark row to the CSV when free-tier export count >= limit. The
// UI surfaces the constraint either way.
function planLabel(plan: "free" | "pro") {
  return plan === "pro" ? "Pro · Unlimited exports" : "Free · Capped exports";
}

export function ExportPanel({
  abstractId,
  abstractTitle,
  plan,
  existingExportCount,
  fieldCount,
}: Props) {
  const [format, setFormat] = useState<ExportFormat>("yardi");
  const [state, setState] = useState<DownloadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const successRef = useRef<HTMLDivElement>(null);

  const isFree = plan === "free";
  const remainingFree = Math.max(0, FREE_EXPORT_LIMIT - existingExportCount);
  const willWatermark = isFree && remainingFree === 0;
  const blocked = false; // Free plan watermarks rather than hard-blocks (per b-08 tests).

  const spec = FORMAT_SPECS[format];

  // Compute how many of the 30 lease fields actually survive the mapping to
  // the chosen system's columns. Right now LeaseBrief stores exactly the
  // intersection (30 fields ≈ each target's column set), but surface the
  // count so brokers know what they're getting per format.
  const mappedFieldCount = useMemo(() => {
    if (fieldCount === 0) return spec.columns.length;
    return Math.min(fieldCount, spec.columns.length);
  }, [fieldCount, spec.columns.length]);

  // Move focus to the success region when a download completes — analogous
  // to the FakeDoor pattern. Restores screen-reader context after the async
  // operation lands.
  useEffect(() => {
    if (state === "success") successRef.current?.focus();
  }, [state]);

  const onDownload = useCallback(async () => {
    if (state === "downloading") return;
    setState("downloading");
    setErrorMessage("");
    try {
      // The CSV generation route is wired by scaffold-wire in B3 — point at
      // its planned URL now so the analytics + state-machine are correct.
      // Until the route exists, the client falls through to the catch block,
      // which is exactly the "error" state we want to surface.
      const url = `/api/export?abstract_id=${encodeURIComponent(
        abstractId,
      )}&format=${format}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(
          res.status === 402
            ? "Free-tier limit reached. Watermarked CSV returned."
            : `Export failed (${res.status})`,
        );
      }
      // Stream the response into a downloadable blob.
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeTitle =
        abstractTitle.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() ||
        `abstract-${abstractId.slice(0, 8)}`;
      a.download = `${safeTitle}.${spec.fileSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      // Fire b-08 analytics: abstract_exported with format + plan_at_export.
      trackAbstractExported({
        abstract_id: abstractId,
        format,
        plan_at_export: plan,
      });
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again.",
      );
    }
  }, [abstractId, abstractTitle, format, plan, spec.fileSuffix, state]);

  return (
    <div className="space-y-10">
      {/* Abstract identity strip */}
      <section
        className="ring-card-light flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--vellum)] p-6 md:flex-row md:items-center md:justify-between md:p-7"
        aria-labelledby="abstract-identity-title"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brass)]/15 font-display text-lg text-[var(--brass)]"
          >
            §
          </span>
          <div className="space-y-1">
            <p className="eyebrow">Abstract</p>
            <h2
              id="abstract-identity-title"
              className="font-display text-xl leading-snug md:text-2xl"
            >
              {abstractTitle || `Abstract ${abstractId.slice(0, 8)}`}
            </h2>
            <p className="font-mono text-xs text-[var(--whisper)]">
              ID {abstractId}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:flex md:items-end md:gap-x-10">
          <div>
            <dt className="eyebrow">Fields</dt>
            <dd className="font-mono text-lg text-[var(--ink)]">
              {fieldCount || 30}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Plan</dt>
            <dd
              className={`font-mono text-lg ${
                plan === "pro" ? "text-[var(--confidence-high)]" : "text-[var(--ink)]"
              }`}
            >
              {planLabel(plan)}
            </dd>
          </div>
          {isFree ? (
            <div className="col-span-2 md:col-auto">
              <dt className="eyebrow">Remaining</dt>
              <dd className="font-mono text-lg text-[var(--ink)]">
                {remainingFree}
                <span className="ml-1 text-sm text-[var(--whisper)]">
                  / {FREE_EXPORT_LIMIT}
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Plan-aware advisory */}
      {willWatermark ? (
        <Alert>
          <AlertTitle className="font-display text-base">
            You&apos;ve used all free exports for this abstract.
          </AlertTitle>
          <AlertDescription>
            We&apos;ll still emit the CSV, but it will include a
            <span className="font-mono"> &quot;Generated by LeaseBrief (Free)&quot; </span>
            footer row. Upgrade for clean, unlimited exports.
          </AlertDescription>
          <div className="mt-3">
            <Link
              href="/pricing"
              className={`${buttonVariants({ variant: "default" })} h-10 rounded-full px-5`}
            >
              See pricing
            </Link>
          </div>
        </Alert>
      ) : null}

      {/* Format picker — custom role="radio" cluster with roving tabindex */}
      <section aria-labelledby="format-picker-title" className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Step 1</p>
            <h3
              id="format-picker-title"
              className="font-display text-2xl md:text-3xl"
            >
              Choose your destination system.
            </h3>
            <p className="mt-1 max-w-2xl text-[var(--whisper)]">
              Headers and column order are baked to each system&apos;s import
              spec. Use Arrow keys to move between options.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Export format"
          className="grid gap-4 md:grid-cols-3"
        >
          {FORMAT_ORDER.map((value, index) => {
            const s = FORMAT_SPECS[value];
            const active = format === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={rovingTabIndex(FORMAT_ORDER, format, index)}
                onClick={() => setFormat(value)}
                onKeyDown={(e) =>
                  handleRadioGroupKey(e, FORMAT_ORDER, format, setFormat)
                }
                className={`group/format relative flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--vellum)] p-6 text-left transition-all duration-180 ease-[var(--ease-snap)] focus-visible:outline-none ${
                  active
                    ? "ring-card-heavy -translate-y-[2px] ring-2 ring-[var(--brass)]"
                    : "ring-card-light hover:-translate-y-[2px] hover:ring-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow">{s.system}</p>
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      active
                        ? "border-[var(--brass)] bg-[var(--brass)]"
                        : "border-[var(--ash)] bg-transparent"
                    }`}
                  >
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--vellum)]" />
                    ) : null}
                  </span>
                </div>
                <h4 className="font-display text-2xl leading-tight">
                  {s.label}
                </h4>
                <p className="text-sm leading-relaxed text-[var(--whisper)]">
                  {s.description}
                </p>
                <div className="mt-1 flex items-end justify-between">
                  <span className="font-mono text-xs text-[var(--whisper)]">
                    {s.columns.length} columns
                  </span>
                  <span
                    className={`text-xs font-medium tracking-wide uppercase ${
                      active ? "text-[var(--brass)]" : "text-[var(--whisper)]"
                    }`}
                  >
                    {active ? "Selected" : "Choose"}
                  </span>
                </div>
                {/* brass beam at the foot of the active card — signature touch */}
                <span
                  aria-hidden="true"
                  className={`absolute right-6 bottom-0 left-6 h-[2px] origin-left rounded-full bg-[var(--brass)] transition-transform duration-[600ms] ease-[var(--ease-snap)] ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Column preview — Tabs for compactness on mobile, full grid on desktop */}
      <section aria-labelledby="column-preview-title" className="space-y-5">
        <div>
          <p className="eyebrow">Step 2</p>
          <h3
            id="column-preview-title"
            className="font-display text-2xl md:text-3xl"
          >
            Confirm the column map.
          </h3>
          <p className="mt-1 max-w-2xl text-[var(--whisper)]">
            These are the exact headers that will appear in the CSV, in this
            order. Mapping is automatic from the 30 LeaseBrief fields.
          </p>
        </div>

        <div className="ring-card rounded-[var(--radius-card)] bg-[var(--vellum)]">
          {/* Mobile: tab strip mirrors the cards */}
          <div className="-mx-1 overflow-x-auto px-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tabs
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <TabsList className="mx-4 mt-4">
                {FORMAT_ORDER.map((v) => (
                  <TabsTrigger key={v} value={v}>
                    {FORMAT_SPECS[v].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--ash)] pb-4">
              <p className="font-display text-lg">
                {spec.system}
                <span className="ml-2 font-mono text-xs text-[var(--whisper)]">
                  · {spec.fileSuffix}.csv
                </span>
              </p>
              <p className="font-mono text-xs text-[var(--whisper)]">
                {spec.columns.length} columns · {mappedFieldCount} fields mapped
              </p>
            </div>
            <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {spec.columns.map((col, idx) => (
                <li
                  key={col}
                  className="flex items-baseline gap-3 border-b border-[var(--ash)]/40 py-1.5"
                >
                  <span
                    className="w-6 text-right font-mono text-xs text-[var(--whisper)]"
                    aria-hidden="true"
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[13px] text-[var(--ink)]">
                    {col}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Download CTA + status region */}
      <section
        aria-labelledby="download-title"
        className="ring-card rounded-[var(--radius-card)] bg-[var(--vellum)] p-6 md:p-8"
      >
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
            <p className="eyebrow">Step 3</p>
            <h3 id="download-title" className="font-display text-2xl md:text-3xl">
              Generate {spec.label} CSV.
            </h3>
            <p className="max-w-xl text-[var(--whisper)]">
              We&apos;ll write a fresh CSV with{" "}
              <span className="font-mono text-[var(--ink)]">
                {spec.columns.length}
              </span>{" "}
              columns and stream it as a download.{" "}
              {willWatermark
                ? "A free-tier watermark row will be appended."
                : isFree
                  ? `${remainingFree} free export${remainingFree === 1 ? "" : "s"} left for this abstract.`
                  : "No limits on Pro."}
            </p>
            {/* Live status region — unconditionally mounted, content toggles */}
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${
                state === "error"
                  ? "text-[var(--destructive)]"
                  : state === "success"
                    ? "text-[var(--confidence-high)]"
                    : "sr-only"
              }`}
            >
              {state === "error"
                ? errorMessage
                : state === "success"
                  ? "Download started. Check your browser's downloads."
                  : "Ready to export."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <Button
              type="button"
              onClick={onDownload}
              disabled={state === "downloading" || blocked}
              aria-label={
                state === "downloading"
                  ? "Generating export"
                  : `Download ${spec.label} CSV`
              }
              className="h-11 rounded-full bg-[var(--brass)] px-7 text-[var(--ink)] hover:bg-[var(--brass)]/90"
            >
              {state === "downloading" ? (
                <>
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)]"
                  />
                  Generating…
                </>
              ) : (
                <>Download {spec.label} CSV</>
              )}
            </Button>
            <Link
              href={`/abstract/${abstractId}`}
              className="text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline"
            >
              Back to abstract
            </Link>
          </div>
        </div>

        {/* Focusable success region — appears after a completed download */}
        {state === "success" ? (
          <div
            ref={successRef}
            tabIndex={-1}
            aria-live="polite"
            className="mt-6 flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--background)] p-5 ring-1 ring-[var(--confidence-high)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)] md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-display text-base">
                {spec.label} CSV delivered.
              </p>
              <p className="text-sm text-[var(--whisper)]">
                Drop it into {spec.system} via its standard lease-import flow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setState("idle")}
                variant="outline"
                className="h-9 rounded-full px-5"
              >
                Export another format
              </Button>
              <Link
                href="/dashboard"
                className={`${buttonVariants({ variant: "default" })} h-9 rounded-full px-5`}
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
