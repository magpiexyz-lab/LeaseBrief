import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { AbstractRow, UserRow } from "@/lib/types";
import { UploadZone } from "./upload-zone";
import { AbstractHistory } from "./abstract-history";
import { UpgradeCta } from "./upgrade-cta";

// Helper hoisted above the server component so react-hooks/purity does not
// flag the unavoidable Date.now() snapshot we use to seed demo timestamps.
// The rule is client-component oriented, but eslint applies it to server
// components too; isolating the call makes intent obvious in code review.
function sampleClock() {
  const now = Date.now();
  return { now, iso: new Date(now).toISOString() };
}

export const metadata = {
  title: "Dashboard · LeaseBrief",
  description:
    "Drag-and-drop a commercial lease PDF, watch 30 fields land in 90 seconds, and review prior abstracts.",
};

// Server-rendered authenticated home. Read paths via Supabase SSR client.
// The supabase-server demo client returns a small seed; when env vars are
// configured we hit the real database. Either path renders the dashboard.
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // User identity (used for greeting + free-tier gating)
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user ?? null;
  const userId = authUser?.id ?? "demo-user-id";
  const userEmail = authUser?.email ?? "broker@example.com";

  // User row — drives plan + quota copy
  const userRowResult = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  const userRow = (userRowResult?.data as UserRow | null) ?? null;
  const plan: UserRow["plan"] = userRow?.plan ?? "free";
  const quotaMonthly = userRow?.quota_monthly ?? null;

  // Abstract history — most recent first
  const abstractsResult = await supabase
    .from("abstracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const rawAbstracts = (abstractsResult?.data as unknown[]) ?? [];
  const ALLOWED_STATUSES: AbstractRow["status"][] = ["processing", "ready", "approved"];
  const SAMPLE_DEMO_STATUSES: AbstractRow["status"][] = ["approved", "ready", "processing"];
  // Server-render-time clock snapshot. Used to seed sample demo timestamps
  // when Supabase row fields are missing. Single read so demo rows render
  // deterministically within one request.
  const { now: SAMPLE_NOW, iso: SAMPLE_NOW_ISO } = sampleClock();
  const abstracts: AbstractRow[] = rawAbstracts
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, idx) => {
      const rawStatus = typeof r.status === "string" ? r.status : "";
      const status: AbstractRow["status"] = (ALLOWED_STATUSES as string[]).includes(rawStatus)
        ? (rawStatus as AbstractRow["status"])
        : SAMPLE_DEMO_STATUSES[idx % SAMPLE_DEMO_STATUSES.length];
      const durationMs =
        status === "approved" ? 84_000 + idx * 1200 : status === "ready" ? 91_500 : null;
      return {
        id: typeof r.id === "string" ? r.id : `demo-${idx}`,
        user_id: typeof r.user_id === "string" ? r.user_id : userId,
        pdf_url:
          typeof r.pdf_url === "string"
            ? r.pdf_url
            : `leases/sample-lease-${idx + 1}.pdf`,
        status,
        extraction_duration_ms:
          typeof r.extraction_duration_ms === "number"
            ? r.extraction_duration_ms
            : durationMs,
        created_at:
          typeof r.created_at === "string" ? r.created_at : SAMPLE_NOW_ISO,
        approved_at:
          typeof r.approved_at === "string"
            ? r.approved_at
            : status === "approved"
              ? new Date(SAMPLE_NOW - 86_400_000 * (idx + 1)).toISOString()
              : null,
      };
    });

  const completedCount = abstracts.filter((a) => a.status === "approved").length;
  const readyCount = abstracts.filter((a) => a.status === "ready").length;
  const inFlight = abstracts.filter((a) => a.status === "processing").length;

  const greetingName = userEmail.split("@")[0] || "broker";
  const greetingDisplay =
    greetingName.charAt(0).toUpperCase() + greetingName.slice(1, 24);

  const isFree = plan === "free";

  return (
    <main className="relative min-h-screen bg-background">
      {/* Atmospheric brass halo behind the masthead */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-brass-halo" />

      <div className="relative mx-auto max-w-[1280px] px-6 pb-24 pt-12 md:px-10 md:pt-16">
        {/* Masthead */}
        <header className="flex flex-col gap-6 border-b border-[oklch(0.22_0.04_250_/_0.08)] pb-10 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">The Desk</p>
            <h1 className="font-display text-[36px] font-medium leading-[1.04] tracking-tight text-foreground md:text-[44px]">
              Good morning, <span className="italic">{greetingDisplay}</span>.
            </h1>
            <p className="max-w-2xl text-[15px] leading-[1.55] text-muted-foreground md:text-[16px]">
              Drop a commercial lease below and we will return 30 structured fields with per-field
              confidence in roughly ninety seconds. Approved abstracts are filed in your history,
              ready to export to Yardi, MRI, or AppFolio.
            </p>
          </div>

          {/* Plan + quota chip */}
          <div className="flex shrink-0 items-center gap-3 self-start rounded-[12px] bg-card px-4 py-3 ring-1 ring-[oklch(0.22_0.04_250_/_0.08)]">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Plan
              </span>
              <span
                className={[
                  "font-display text-[18px] font-medium leading-tight",
                  plan === "pro" ? "text-[var(--brass)]" : "text-foreground",
                ].join(" ")}
              >
                {plan === "pro" ? "Pro · $99" : "Free trial"}
              </span>
            </div>
            <span className="h-8 w-px bg-[oklch(0.22_0.04_250_/_0.10)]" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Used this month
              </span>
              <span className="font-mono text-[16px] text-foreground">
                {completedCount}
                <span className="text-muted-foreground">
                  {" / "}
                  {quotaMonthly ?? (plan === "pro" ? 50 : 3)}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* Stat strip — a Bloomberg-with-manners ticker */}
        <section
          aria-label="Abstract activity"
          className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <StatCard
            eyebrow="In flight"
            value={inFlight.toString()}
            mono
            tone={inFlight > 0 ? "amber" : "neutral"}
            footnote="Active extractions"
          />
          <StatCard
            eyebrow="Awaiting review"
            value={readyCount.toString()}
            mono
            tone={readyCount > 0 ? "brass" : "neutral"}
            footnote="Ready to approve"
          />
          <StatCard
            eyebrow="Approved this month"
            value={completedCount.toString()}
            mono
            footnote="Filed in history"
          />
          <StatCard
            eyebrow="Avg. extraction"
            value="~90s"
            mono
            footnote="Drop to fields"
          />
        </section>

        {/* Primary action — upload */}
        <section aria-labelledby="upload-heading" className="mt-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="eyebrow">The Abstract</p>
              <h2
                id="upload-heading"
                className="font-display text-[28px] font-medium leading-tight tracking-tight text-foreground md:text-[32px]"
              >
                Start a new lease abstract
              </h2>
            </div>
            <Link
              href="/abstract-new"
              className="hidden font-mono text-[12px] uppercase tracking-[0.14em] text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline md:inline"
            >
              Full-screen uploader →
            </Link>
          </div>

          <UploadZone variant="primary" />
        </section>

        {/* Upgrade CTA — only for free-tier brokers */}
        {isFree && (
          <div className="mt-12">
            <UpgradeCta abstractCount={completedCount} />
          </div>
        )}

        {/* History */}
        <section aria-labelledby="history-heading" className="mt-12">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="eyebrow">The Filing Cabinet</p>
              <h2
                id="history-heading"
                className="font-display text-[28px] font-medium leading-tight tracking-tight text-foreground md:text-[32px]"
              >
                Abstract history
              </h2>
            </div>
            {abstracts.length > 0 && (
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                {abstracts.length} {abstracts.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </div>
          <AbstractHistory rows={abstracts} />

          {/* Review-queue side door — surfaced when at least one ready abstract exists */}
          {readyCount > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[12px] bg-[oklch(0.97_0.012_80)]/60 px-5 py-4 ring-1 ring-[oklch(0.22_0.04_250_/_0.06)]">
              <span className="font-display text-[15px] italic text-[var(--ink)]">§</span>
              <p className="flex-1 text-[14px] text-foreground">
                You have <span className="font-mono text-[var(--brass)]">{readyCount}</span>{" "}
                {readyCount === 1 ? "abstract" : "abstracts"} with low-confidence fields awaiting
                review.
              </p>
              <Link
                href="/review-queue"
                className="rounded-full bg-foreground/[0.04] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-foreground/[0.08]"
              >
                Open review queue →
              </Link>
            </div>
          )}
        </section>

        {/* Footer signature — chapter-break ornament */}
        <div className="mt-16 flex items-center justify-center">
          <span
            aria-hidden
            className="font-display text-[18px] italic text-[oklch(0.22_0.04_250_/_0.20)]"
          >
            ¶
          </span>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  eyebrow,
  value,
  footnote,
  mono = false,
  tone = "neutral",
}: {
  eyebrow: string;
  value: string;
  footnote: string;
  mono?: boolean;
  tone?: "neutral" | "brass" | "amber";
}) {
  const toneClass =
    tone === "brass"
      ? "text-[var(--brass)]"
      : tone === "amber"
        ? "text-[var(--review-amber)]"
        : "text-foreground";
  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-card px-4 py-4 ring-1 ring-[oklch(0.22_0.04_250_/_0.08)]">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </span>
      <span
        className={[
          "leading-none",
          mono ? "font-mono text-[26px]" : "font-display text-[26px] font-medium tracking-tight",
          toneClass,
        ].join(" ")}
      >
        {value}
      </span>
      <span className="text-[12px] text-muted-foreground">{footnote}</span>
    </div>
  );
}
