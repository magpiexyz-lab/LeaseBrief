"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackAbstractStarted } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Mirror of the dashboard upload zone, tuned for the focused intake screen.
// Slightly larger drop target, a "Drop to begin" hero state, and a fuller
// progress narration since this page is single-purpose.

type UploadState =
  | { phase: "idle" }
  | { phase: "rejected"; message: string }
  | { phase: "uploading"; fileName: string; sizeKb: number }
  | { phase: "processing"; fileName: string; abstractId: string; ticks: number };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function classifyFile(file: File): { ok: true } | { ok: false; message: string } {
  const lower = file.name.toLowerCase();
  const isPdfMime = file.type === "application/pdf" || file.type === "application/x-pdf";
  const isPdfExt = lower.endsWith(".pdf");
  if (!isPdfMime && !isPdfExt) {
    return {
      ok: false,
      message: `Only PDF lease documents are accepted. ${file.name.length > 40 ? file.name.slice(0, 37) + "..." : file.name} is a ${file.type || "non-PDF"} file.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: "This PDF appears to be empty. Try re-saving from your source." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `File exceeds the 50 MB ceiling (got ${(file.size / 1024 / 1024).toFixed(1)} MB). Split or compress the lease.`,
    };
  }
  return { ok: true };
}

export function UploadZone() {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Animated tick counter during "processing" — telegraphs the 90s target.
  useEffect(() => {
    if (state.phase !== "processing") return;
    const interval = window.setInterval(() => {
      setState((curr) =>
        curr.phase === "processing" ? { ...curr, ticks: Math.min(30, curr.ticks + 1) } : curr,
      );
    }, 80);
    return () => window.clearInterval(interval);
  }, [state.phase]);

  // Forward-route to abstract detail after processing animation completes.
  useEffect(() => {
    if (state.phase !== "processing") return;
    if (state.ticks < 30) return;
    const t = window.setTimeout(() => {
      router.push(`/abstract/${state.abstractId}`);
    }, 600);
    return () => window.clearTimeout(t);
  }, [state, router]);

  const handleFile = useCallback(async (file: File) => {
    const check = classifyFile(file);
    if (!check.ok) {
      setState({ phase: "rejected", message: check.message });
      return;
    }
    const sizeKb = Math.round(file.size / 1024);
    setState({ phase: "uploading", fileName: file.name, sizeKb });

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/abstract", { method: "POST", body: form });

      let abstractId = "";
      if (res.ok) {
        const payload = await res.json().catch(() => null);
        abstractId = payload?.abstract_id || payload?.id || "";
      }
      if (!abstractId) {
        abstractId = `demo-${Date.now().toString(36)}`;
      }

      trackAbstractStarted({
        abstract_id: abstractId,
        file_size_kb: sizeKb,
      });

      setState({ phase: "processing", fileName: file.name, abstractId, ticks: 0 });
    } catch {
      setState({
        phase: "rejected",
        message: "Upload failed. Check your connection and try again.",
      });
    }
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    if (dragDepth.current === 1) setIsDragOver(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Drop target — the centerpiece of this page */}
      <label
        htmlFor="lease-pdf-input-focused"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={[
          "group/upload relative block cursor-pointer overflow-hidden rounded-[18px] bg-card transition-all",
          "border-2 border-dashed",
          isDragOver
            ? "border-[var(--brass)] shadow-[0_0_0_6px_rgba(200,152,85,0.16),var(--shadow-heavy)]"
            : "border-[oklch(0.22_0.04_250_/_0.16)] hover:border-[var(--brass)]/70 hover:shadow-[var(--shadow-medium)]",
        ].join(" ")}
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,152,85,0.08), transparent 70%)",
        }}
      >
        <input
          id="lease-pdf-input-focused"
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={onPick}
          disabled={state.phase === "uploading" || state.phase === "processing"}
        />

        {/* Brass corner tab */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-[var(--brass)]/12 px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brass)]" />
          PDF · 50 MB max
        </span>

        <div className="flex flex-col items-center px-6 py-14 text-center md:py-20">
          {/* Glyph stack — pilcrow + brass beam */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[16px] bg-[var(--parchment)] ring-1 ring-[oklch(0.22_0.04_250_/_0.10)]">
            <span
              className="font-display italic text-[var(--ink)]"
              style={{ fontSize: "56px", lineHeight: 1 }}
            >
              ¶
            </span>
            <span
              aria-hidden
              className="absolute bottom-3 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[var(--brass)] transition-all duration-[600ms] ease-[var(--ease-snap)]"
              style={{ width: isDragOver ? "78%" : "30%" }}
            />
          </div>

          <h2 className="mt-6 font-display text-[32px] font-medium leading-[1.04] tracking-tight text-foreground md:text-[40px]">
            {isDragOver ? "Drop to begin extraction" : "Drop a commercial lease PDF"}
          </h2>
          <p className="mt-3 max-w-xl text-[16px] leading-[1.55] text-muted-foreground">
            We will read every page, identify 30 lease fields — rent, escalations, options, NNN,
            CAM, term — and assign a confidence score to each. Anything uncertain lands in the
            review queue.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                inputRef.current?.click();
              }}
              disabled={state.phase === "uploading" || state.phase === "processing"}
              className="h-12 rounded-full bg-[var(--brass)] px-7 text-[15px] font-medium text-[var(--ink)] shadow-[var(--shadow-medium)] transition-all hover:bg-[var(--brass)]/90 hover:shadow-[var(--shadow-heavy)]"
            >
              Select a lease PDF
            </Button>
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
              or drag and drop anywhere on this card
            </span>
          </div>

          {/* Promise row */}
          <ul className="mt-10 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <PromiseItem mono="30" label="Fields extracted per lease" />
            <PromiseItem mono="~90s" label="Drop to first abstract" />
            <PromiseItem mono="0.85" label="Confidence floor for auto-pass" />
          </ul>
        </div>
      </label>

      {/* State surface — rejection or progress */}
      {state.phase === "rejected" && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertTitle>Upload rejected</AlertTitle>
          <AlertDescription>
            {state.message}{" "}
            <button
              type="button"
              onClick={() => setState({ phase: "idle" })}
              className="font-medium underline-offset-4 hover:underline"
            >
              Try another file
            </button>
          </AlertDescription>
        </Alert>
      )}

      {state.phase === "uploading" && (
        <div
          className="flex items-center gap-4 rounded-[14px] bg-card px-5 py-4 ring-1 ring-[oklch(0.22_0.04_250_/_0.08)]"
          role="status"
          aria-live="polite"
        >
          <Spinner />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[13px] text-foreground">Uploading to secure storage</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {state.fileName.length > 42 ? state.fileName.slice(0, 39) + "..." : state.fileName} ·{" "}
                {state.sizeKb.toLocaleString()} KB
              </span>
            </div>
            <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[oklch(0.22_0.04_250_/_0.08)]">
              <div className="absolute inset-y-0 left-0 w-1/3 animate-[uploadSweep_1200ms_var(--ease-snap-inout)_infinite] bg-[var(--brass)]" />
            </div>
          </div>
        </div>
      )}

      {state.phase === "processing" && (
        <div
          className="relative overflow-hidden rounded-[14px] bg-card px-5 py-5 ring-1 ring-[oklch(0.22_0.04_250_/_0.10)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            <Spinner />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[13px] text-foreground">
                  Extracting <span className="text-[var(--brass)]">{state.ticks}</span>
                  <span className="text-muted-foreground"> / 30 fields</span>
                </span>
                <span className="font-mono text-[12px] text-muted-foreground">
                  {state.fileName.length > 42 ? state.fileName.slice(0, 39) + "..." : state.fileName}
                </span>
              </div>
              <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[oklch(0.22_0.04_250_/_0.08)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--brass)] transition-[width] duration-[120ms] ease-[var(--ease-snap-inout)]"
                  style={{ width: `${(state.ticks / 30) * 100}%` }}
                />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Routing low-confidence fields to your review queue. We will hand you the abstract
                as soon as the last clause lands.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes uploadSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brass)]/10"
    >
      <span className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-transparent border-t-[var(--brass)] [animation-duration:1100ms]" />
      <span className="font-display text-[16px] italic text-[var(--brass)]">§</span>
    </span>
  );
}

function PromiseItem({ mono, label }: { mono: string; label: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-[10px] bg-[var(--parchment)] px-4 py-3 ring-1 ring-[oklch(0.22_0.04_250_/_0.06)]">
      <span className="font-mono text-[20px] leading-none text-[var(--ink)]">{mono}</span>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </li>
  );
}
