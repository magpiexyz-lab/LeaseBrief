import Link from "next/link";
import { UploadZone } from "./upload-zone";

export const metadata = {
  title: "New abstract · LeaseBrief",
  description:
    "Single-purpose intake screen — drop a commercial lease PDF and we will return 30 fields in 90 seconds with confidence scoring.",
};

// The "Abstract New" page is a focused intake screen. Reuses the same upload
// behavior as the dashboard but presents it as the single thing on the page,
// for brokers who came here from a header link or a marketing CTA.
export default function AbstractNewPage() {
  return (
    <main className="relative min-h-screen bg-background">
      {/* Brass halo behind the masthead — atmospheric depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(200,152,85,0.12), transparent 65%), radial-gradient(ellipse 40% 40% at 90% 30%, rgba(26,34,56,0.04), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[920px] px-6 pb-24 pt-12 md:px-10 md:pt-20">
        {/* Breadcrumb / back-link */}
        <nav className="mb-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
          <Link
            href="/dashboard"
            className="rounded px-1 text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            ← Dashboard
          </Link>
          <span aria-hidden>·</span>
          <span>New abstract</span>
        </nav>

        {/* Masthead */}
        <header className="mb-10 flex flex-col gap-4">
          <p className="eyebrow">The Intake</p>
          <h1 className="font-display text-[44px] font-medium leading-[1.04] tracking-tight text-foreground md:text-[56px]">
            One lease. <span className="italic text-[var(--brass)]">Ninety seconds.</span>
          </h1>
          <p className="max-w-2xl text-[17px] leading-[1.55] text-muted-foreground md:text-[18px]">
            Drop a commercial lease PDF below. We will read every page, extract 30 lease fields,
            and assign a confidence score to each — uncertain clauses are routed to your review
            queue, not to a contractor.
          </p>
        </header>

        {/* The upload card — full attention */}
        <UploadZone />

        {/* Field preview — what to expect after extraction */}
        <section
          aria-labelledby="fields-preview-heading"
          className="mt-14 rounded-[14px] bg-card px-6 py-7 ring-1 ring-[oklch(0.22_0.04_250_/_0.08)] md:px-8 md:py-9"
        >
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="eyebrow">What you will see</p>
              <h2
                id="fields-preview-heading"
                className="font-display text-[22px] font-medium leading-tight tracking-tight text-foreground md:text-[26px]"
              >
                Thirty fields, four categories.
              </h2>
            </div>
            <span className="hidden font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground md:inline">
              Per-field confidence
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldGroup
              title="Rent & escalations"
              items={[
                { name: "Base rent", confidence: 0.97 },
                { name: "Escalation type", confidence: 0.92 },
                { name: "Escalation %", confidence: 0.88 },
                { name: "Rent commencement", confidence: 0.94 },
              ]}
            />
            <FieldGroup
              title="Term & options"
              items={[
                { name: "Lease term (mo)", confidence: 0.96 },
                { name: "Option to extend", confidence: 0.81 },
                { name: "Renewal notice (days)", confidence: 0.78 },
                { name: "Expiration date", confidence: 0.99 },
              ]}
            />
            <FieldGroup
              title="Operating expenses"
              items={[
                { name: "NNN pass-through", confidence: 0.9 },
                { name: "CAM cap", confidence: 0.74 },
                { name: "Tax stop", confidence: 0.83 },
                { name: "Insurance allocation", confidence: 0.86 },
              ]}
            />
            <FieldGroup
              title="Premises & tenant"
              items={[
                { name: "Tenant entity", confidence: 0.95 },
                { name: "Premises sq ft", confidence: 0.91 },
                { name: "Use clause", confidence: 0.76 },
                { name: "Subordination", confidence: 0.82 },
              ]}
            />
          </div>

          <p className="mt-6 text-[13px] text-muted-foreground">
            Fields with confidence below <span className="font-mono">0.85</span> are flagged amber
            and routed to your review queue. Everything else is approved automatically.
          </p>
        </section>

        {/* Footnote / secondary actions — keep the page from dead-ending */}
        <div className="mt-12 flex flex-col items-start gap-4 border-t border-[oklch(0.22_0.04_250_/_0.08)] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-muted-foreground">
            Already have abstracts in flight?{" "}
            <Link
              href="/dashboard"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Return to your dashboard
            </Link>{" "}
            to track them.
          </p>
          <Link
            href="/pricing"
            className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Pricing memo →
          </Link>
        </div>

        {/* Chapter-break ornament */}
        <div className="mt-12 flex items-center justify-center">
          <span
            aria-hidden
            className="font-display text-[18px] italic text-[oklch(0.22_0.04_250_/_0.20)]"
          >
            §
          </span>
        </div>
      </div>
    </main>
  );
}

function FieldGroup({
  title,
  items,
}: {
  title: string;
  items: { name: string; confidence: number }[];
}) {
  return (
    <div className="rounded-[12px] bg-[var(--parchment)] px-4 py-4 ring-1 ring-[oklch(0.22_0.04_250_/_0.06)]">
      <p className="mb-3 font-display text-[15px] font-medium leading-tight tracking-tight text-foreground">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((field) => {
          const high = field.confidence >= 0.85;
          return (
            <li
              key={field.name}
              className="flex items-center justify-between gap-3 border-t border-[oklch(0.22_0.04_250_/_0.06)] pt-2 first:border-t-0 first:pt-0"
            >
              <span className="text-[14px] text-foreground">{field.name}</span>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-mono text-[11px]",
                  high
                    ? "bg-[oklch(0.97_0.03_155)]/60 text-[var(--confidence-high)] ring-1 ring-[oklch(0.58_0.12_155_/_0.25)]"
                    : "bg-[oklch(0.97_0.04_70)]/60 text-[var(--review-amber)] ring-1 ring-[oklch(0.73_0.15_70_/_0.30)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    high ? "bg-[var(--confidence-high)]" : "bg-[var(--review-amber)]",
                  ].join(" ")}
                />
                {field.confidence.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
