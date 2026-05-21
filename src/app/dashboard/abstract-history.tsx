import Link from "next/link";
import Image from "next/image";
import type { AbstractRow } from "@/lib/types";

const STATUS_COPY: Record<
  AbstractRow["status"],
  { label: string; dotClass: string; textClass: string; ringClass: string }
> = {
  processing: {
    label: "Extracting",
    dotClass: "bg-[var(--review-amber)] animate-pulse",
    textClass: "text-[var(--review-amber)]",
    ringClass: "ring-[oklch(0.73_0.15_70_/_0.30)]",
  },
  ready: {
    label: "Ready for review",
    dotClass: "bg-[var(--brass)]",
    textClass: "text-[var(--brass)]",
    ringClass: "ring-[oklch(0.72_0.13_75_/_0.30)]",
  },
  approved: {
    label: "Approved",
    dotClass: "bg-[var(--confidence-high)]",
    textClass: "text-[var(--confidence-high)]",
    ringClass: "ring-[oklch(0.58_0.12_155_/_0.30)]",
  },
};

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeDays(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours <= 0) {
      const mins = Math.max(1, Math.floor(diffMs / 60_000));
      return RELATIVE.format(-mins, "minute");
    }
    return RELATIVE.format(-hours, "hour");
  }
  if (days < 30) return RELATIVE.format(-days, "day");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fileLabelFromPath(path: string | null, idx: number): string {
  if (!path) return `Lease abstract ${idx + 1}`;
  const tail = path.split("/").pop() || path;
  return tail.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

function durationLabel(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 90_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export function AbstractHistory({ rows }: { rows: AbstractRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] bg-card px-8 py-14 text-center ring-1 ring-[oklch(0.22_0.04_250_/_0.08)]">
        <Image
          src="/images/empty-state.webp"
          alt="No abstracts yet"
          width={180}
          height={180}
          className="opacity-95"
          priority={false}
        />
        <p className="mt-4 font-display text-[22px] font-medium leading-tight tracking-tight text-foreground">
          No abstracts yet.
        </p>
        <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
          Drop a commercial lease PDF above to see 30 structured fields and per-field confidence
          appear here.
        </p>
        <p className="mt-4 font-display text-[18px] italic text-[oklch(0.22_0.04_250_/_0.30)]">¶</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-card ring-1 ring-[oklch(0.22_0.04_250_/_0.08)]">
      {/* Header row */}
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_120px_24px] items-center gap-4 border-b border-[oklch(0.22_0.04_250_/_0.08)] px-5 py-3 md:grid">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Lease
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Status
        </span>
        <span className="text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Extracted in
        </span>
        <span className="text-right font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Created
        </span>
        <span />
      </div>

      <ul className="divide-y divide-[oklch(0.22_0.04_250_/_0.06)]">
        {rows.map((row, idx) => {
          const status = STATUS_COPY[row.status] ?? STATUS_COPY.processing;
          const isOpenable = row.status !== "processing";
          const label = fileLabelFromPath(row.pdf_url, idx);
          const href = `/abstract/${row.id}`;

          const inner = (
            <div className="grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors md:grid-cols-[minmax(0,1fr)_120px_120px_120px_24px] md:gap-4 md:py-3.5">
              {/* Lease label + ID */}
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-display text-[17px] font-medium leading-tight text-foreground">
                  {label}
                </span>
                <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  #{row.id.slice(0, 8)}
                </span>
              </div>

              {/* Status pill */}
              <div>
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-[6px] bg-card px-2 py-1 text-[12px] font-medium ring-1",
                    status.textClass,
                    status.ringClass,
                  ].join(" ")}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                  {status.label}
                </span>
              </div>

              {/* Duration */}
              <span className="font-mono text-[13px] text-foreground md:text-right">
                {durationLabel(row.extraction_duration_ms)}
              </span>

              {/* Date */}
              <span className="font-mono text-[12px] text-muted-foreground md:text-right">
                {relativeDays(row.created_at)}
              </span>

              {/* Affordance arrow */}
              <span
                aria-hidden
                className={[
                  "justify-self-end font-display text-[18px] transition-transform",
                  isOpenable
                    ? "text-[var(--brass)] group-hover/row:translate-x-0.5"
                    : "text-[oklch(0.22_0.04_250_/_0.18)]",
                ].join(" ")}
              >
                →
              </span>
            </div>
          );

          if (!isOpenable) {
            return (
              <li
                key={row.id}
                className="group/row block cursor-default opacity-90"
                aria-disabled="true"
              >
                {inner}
              </li>
            );
          }

          return (
            <li key={row.id} className="group/row">
              <Link
                href={href}
                className="block transition-colors hover:bg-[oklch(0.97_0.012_80)]/60 focus-visible:bg-[oklch(0.97_0.012_80)]/80 focus-visible:outline-none"
              >
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
