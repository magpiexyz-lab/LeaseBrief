export type Variant = {
  slug: string;
  headline: string;
  subheadline: string;
  cta: string;
  promise: string;
  proof: string;
  urgency: string;
  painPoints: [string, string, string];
  pricingAmount: number;
  pricingModel: "subscription" | "one-time" | "usage-based" | "freemium";
};

export const VARIANTS: ReadonlyArray<Variant> = [
  {
    slug: "speed",
    headline: "Lease Abstracts in 90 Seconds, Not 8 Hours",
    subheadline:
      "Drop a commercial lease PDF, get 30 structured fields back with confidence scoring, and export to Yardi, MRI, or AppFolio in one click.",
    cta: "Create a free account",
    promise: "Get your afternoon back — every lease becomes a 90-second job.",
    proof:
      "The same 30-field abstract Datapoint charges $200-500 per document for, returned by AI in 90 seconds with per-field confidence.",
    urgency:
      "Every lease you're still abstracting by hand is a deal you're closing slower.",
    painPoints: [
      "Each in-house lease abstract still burns 4-8 hours of broker or analyst time",
      "Datapoint and Lease Probe take 24-72 hours to turn around a single abstract",
      "Half a workday spent on one lease is half a workday not spent closing the next deal",
    ],
    pricingAmount: 19,
    pricingModel: "subscription",
  },
  {
    slug: "cost",
    headline: "Stop Paying $300 Per Lease to Outsourcers",
    subheadline:
      "Run unlimited commercial lease abstracts through your own AI for $19/month flat. 50 abstracts included, $5 each after, no per-document surprises.",
    cta: "Create a free account",
    promise: "Replace your Datapoint or Lease Probe bill with one $19 line item.",
    proof:
      "$19/mo is less than a single outsourced abstract. The average mid-market broker runs 15-30 abstracts a month.",
    urgency:
      "Every outsourced abstract this month is margin you're handing to someone else.",
    painPoints: [
      "Outsourced abstracts cost $200-500 each — $3k-15k/month at typical mid-market volume",
      "Enterprise lease platforms (Visual Lease, MRI Contract Intelligence, Leasecake) start at $5k+/month",
      "Mid-market brokerages are stuck overpaying outsourcers or under-tooled on enterprise software",
    ],
    pricingAmount: 19,
    pricingModel: "subscription",
  },
  {
    slug: "confidential",
    headline: "Your Lease Terms Never Leave Your Team",
    subheadline:
      "AI abstraction with per-field confidence scoring routes uncertain fields to your in-house review queue — not to an outsourced contractor reading your tenant's rent roll.",
    cta: "Create a free account",
    promise:
      "Sensitive lease terms stay between you, your AI extractor, and your in-house reviewer — no third-party humans in the loop.",
    proof:
      "Per-field confidence scoring means uncertain fields stay in your review queue; only your team decides what's final. Nothing low-confidence ever leaves your tenancy.",
    urgency:
      "Every lease you outsource is one more set of confidential terms on someone else's desk.",
    painPoints: [
      "Outsourced abstraction services hand your clients' lease terms to overseas contractors you cannot audit",
      "You have no visibility into who at Datapoint or Lease Probe is reading your sensitive option-to-extend, NNN, and rent escalation clauses",
      "Confidential rent roll data and tenant terms should never sit unattended on a stranger's screen",
    ],
    pricingAmount: 19,
    pricingModel: "subscription",
  },
];

export const DEFAULT_VARIANT_SLUG = "speed";

export function getVariantBySlug(slug: string): Variant | undefined {
  return VARIANTS.find((v) => v.slug === slug);
}

export function listVariantSlugs(): string[] {
  return VARIANTS.map((v) => v.slug);
}
