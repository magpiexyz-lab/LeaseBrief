import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ExportPanel } from "./ExportPanel";
import { FORMAT_SPECS, FREE_EXPORT_LIMIT } from "./columns";

// Local shimmer placeholder — shadcn Skeleton is not installed and we MUST
// not import unavailable components. The vellum-tinted pulse matches the
// visual brief's "subtle 1200ms gradient sweep" loading treatment.
function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[var(--ash)] via-[var(--vellum)] to-[var(--ash)] ${className}`}
      aria-hidden="true"
    />
  );
}

// Auth-gated, query-param-driven page. Re-evaluate at request time so plan
// changes (free → pro via Stripe webhook b-09) and per-abstract export-count
// state are read fresh, not baked into a static prerender.
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ abstract_id?: string }>;

type LoaderResult = {
  abstractId: string | null;
  abstractStatus: "processing" | "ready" | "approved" | null;
  abstractTitle: string | null;
  plan: "free" | "pro";
  existingExportCount: number;
  fieldCount: number;
};

// Server-side load: pulls the user plan + abstract metadata + how many times
// this abstract has already been exported on the free tier. All read-only —
// the actual CSV generation lives in the export API route (wired in B3).
async function loadExportContext(
  abstractId: string | null,
): Promise<LoaderResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: "free" | "pro" = "free";
  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    if (row && (row as { plan?: string }).plan === "pro") plan = "pro";
  }

  if (!abstractId) {
    return {
      abstractId: null,
      abstractStatus: null,
      abstractTitle: null,
      plan,
      existingExportCount: 0,
      fieldCount: 0,
    };
  }

  const { data: abstractRow } = await supabase
    .from("abstracts")
    .select("id, status, pdf_url, created_at")
    .eq("id", abstractId)
    .maybeSingle();

  let abstractStatus: LoaderResult["abstractStatus"] = null;
  let abstractTitle: string | null = null;
  let fieldCount = 0;

  if (abstractRow) {
    const row = abstractRow as {
      id: string;
      status: LoaderResult["abstractStatus"];
      pdf_url: string | null;
      created_at: string;
    };
    abstractStatus = row.status;
    // Derive a friendly title from the PDF filename when available.
    const pdfName = (row.pdf_url ?? "").split("/").pop()?.replace(/\.pdf$/i, "");
    abstractTitle = pdfName?.replace(/[-_]+/g, " ").trim() || `Abstract ${row.id.slice(0, 8)}`;

    const { data: fields } = await supabase
      .from("abstract_fields")
      .select("id")
      .eq("abstract_id", abstractId);
    fieldCount = Array.isArray(fields) ? fields.length : 0;
  }

  // Tally previous exports for this abstract+user to enforce the free-tier cap.
  // `exports` is a side-table populated by the export route in B3; gracefully
  // tolerate its absence pre-wire by treating the count as 0.
  let existingExportCount: number;
  try {
    const { data: exports } = await supabase
      .from("exports")
      .select("id")
      .eq("abstract_id", abstractId);
    existingExportCount = Array.isArray(exports) ? exports.length : 0;
  } catch {
    existingExportCount = 0;
  }

  return {
    abstractId,
    abstractStatus,
    abstractTitle,
    plan,
    existingExportCount,
    fieldCount,
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <Shimmer className="h-4 w-32 rounded-[var(--radius-chip)]" />
        <Shimmer className="h-8 w-2/3 rounded-[var(--radius-input)]" />
        <Shimmer className="h-4 w-1/2 rounded-[var(--radius-chip)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Shimmer
            key={i}
            className="h-56 w-full rounded-[var(--radius-card)]"
          />
        ))}
      </div>
      <Shimmer className="h-72 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

function MissingAbstractCallout() {
  return (
    <section
      className="ring-card relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--vellum)] p-10 md:p-14"
      aria-labelledby="missing-abstract-title"
    >
      <span aria-hidden="true" className="bg-brass-halo pointer-events-none absolute inset-0" />
      <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-xl space-y-4">
          <p className="eyebrow">No abstract selected</p>
          <h2
            id="missing-abstract-title"
            className="font-display text-3xl leading-[1.05] tracking-tight md:text-[40px]"
          >
            Pick an abstract to export.
          </h2>
          <p className="text-base text-[var(--whisper)] md:text-lg">
            The export workspace generates a CSV in your chosen system&apos;s
            import format. Open an approved abstract first, then click
            <span className="font-mono text-[var(--ink)]"> Export </span>
            from its toolbar.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Link
            href="/dashboard"
            className={`${buttonVariants({ variant: "default" })} h-11 rounded-full px-6`}
          >
            Go to dashboard
          </Link>
          <Link
            href="/review-queue"
            className="text-sm font-medium text-[var(--ink)] underline-offset-4 hover:underline"
          >
            Review queued fields instead
          </Link>
        </div>
      </div>
    </section>
  );
}

function NotReadyCallout({
  abstractId,
  status,
}: {
  abstractId: string;
  status: NonNullable<LoaderResult["abstractStatus"]>;
}) {
  const copy =
    status === "processing"
      ? "Extraction is still running. Once the 30 fields land you can export."
      : "The abstract is extracted but not yet approved. Approve it first to lock the field values for export.";

  return (
    <section
      className="ring-card rounded-[var(--radius-card)] bg-[var(--vellum)] p-8 md:p-10"
      aria-labelledby="not-ready-title"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-3">
          <p className="eyebrow text-[var(--review-amber)]">
            {status === "processing" ? "Still extracting" : "Awaiting approval"}
          </p>
          <h2 id="not-ready-title" className="font-display text-2xl md:text-3xl">
            {status === "processing"
              ? "Your fields are still being extracted."
              : "Approve the abstract to unlock export."}
          </h2>
          <p className="max-w-xl text-[var(--whisper)]">{copy}</p>
        </div>
        <Link
          href={`/abstract/${abstractId}`}
          className={`${buttonVariants({ variant: "default" })} h-11 rounded-full px-6`}
        >
          Open abstract
        </Link>
      </div>
    </section>
  );
}

function FormatPreviewFallback() {
  const previews = Object.values(FORMAT_SPECS);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {previews.map((spec) => (
        <article
          key={spec.label}
          className="ring-card flex flex-col gap-3 rounded-[var(--radius-card)] bg-[var(--vellum)] p-5"
        >
          <p className="eyebrow">{spec.system}</p>
          <h3 className="font-display text-xl">{spec.label}</h3>
          <p className="text-sm text-[var(--whisper)]">{spec.description}</p>
          <p className="font-mono text-xs text-[var(--whisper)]">
            {spec.columns.length} columns
          </p>
        </article>
      ))}
    </div>
  );
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const abstractIdRaw = params.abstract_id?.trim() ?? "";
  const abstractId = abstractIdRaw.length > 0 ? abstractIdRaw : null;

  return (
    <main
      className="bg-brass-halo relative min-h-[calc(100vh-4rem)]"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12 md:px-10 md:py-20">
        {/* Header */}
        <header className="mb-12 max-w-3xl space-y-4">
          <p className="eyebrow">
            <span className="font-mono text-[var(--brass)]">§</span> The Export
          </p>
          <h1 className="font-display text-[44px] leading-[1.04] tracking-[-0.025em] md:text-[64px]">
            Hand the abstract to your system of record.
          </h1>
          <p className="text-lg leading-[1.5] text-[var(--whisper)]">
            One source abstract, three destination formats. Choose your
            property-management system below; we&apos;ll emit a CSV whose column
            headers match its import spec, ready to drop in.
          </p>
        </header>

        <Suspense fallback={<LoadingSkeleton />}>
          <ExportBody abstractId={abstractId} />
        </Suspense>

        {/* Static format reference — visible regardless of selection state.
            Helps users orient before they pick an abstract. */}
        <section className="mt-16" aria-labelledby="formats-reference-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Format reference</p>
              <h2
                id="formats-reference-title"
                className="font-display text-2xl md:text-3xl"
              >
                What we hand off, by system.
              </h2>
            </div>
            <p className="hidden text-sm text-[var(--whisper)] md:block">
              Free plan: {FREE_EXPORT_LIMIT} exports per abstract.
            </p>
          </div>
          <FormatPreviewFallback />
        </section>
      </div>
    </main>
  );
}

async function ExportBody({ abstractId }: { abstractId: string | null }) {
  if (!abstractId) {
    return <MissingAbstractCallout />;
  }

  const ctx = await loadExportContext(abstractId);

  if (!ctx.abstractStatus) {
    // Abstract id was provided but not found (or the user can't see it).
    return (
      <section
        className="ring-card rounded-[var(--radius-card)] bg-[var(--vellum)] p-8 md:p-10"
        aria-labelledby="abstract-missing-title"
      >
        <div className="space-y-4">
          <p className="eyebrow text-[var(--destructive)]">Not found</p>
          <h2 id="abstract-missing-title" className="font-display text-2xl md:text-3xl">
            We couldn&apos;t open that abstract.
          </h2>
          <p className="max-w-xl text-[var(--whisper)]">
            It may have been deleted, or it belongs to a different account.
            Pick another from your dashboard.
          </p>
          <Link
            href="/dashboard"
            className={`${buttonVariants({ variant: "default" })} h-11 rounded-full px-6`}
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  if (ctx.abstractStatus !== "approved") {
    return (
      <NotReadyCallout
        abstractId={ctx.abstractId!}
        status={ctx.abstractStatus}
      />
    );
  }

  return (
    <ExportPanel
      abstractId={ctx.abstractId!}
      abstractTitle={ctx.abstractTitle ?? ""}
      plan={ctx.plan}
      existingExportCount={ctx.existingExportCount}
      fieldCount={ctx.fieldCount}
    />
  );
}
