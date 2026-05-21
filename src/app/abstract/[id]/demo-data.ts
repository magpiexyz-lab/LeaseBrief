// Demo data for /abstract/[id] — used in DEMO_MODE and as the fallback when
// no real abstract row is found. Real data comes from Supabase once b-03
// (PDF upload) and b-04 (extraction job) are wired post-bootstrap.

import type { AbstractFieldRow, AbstractRow } from "@/lib/types";

export type DemoAbstractField = Pick<
  AbstractFieldRow,
  "field_name" | "value" | "confidence" | "reviewer_edited" | "source_page"
>;

export type FieldCategory = {
  id: string;
  label: string;
  caption: string;
  fields: DemoAbstractField[];
};

// The canonical 30 fields are grouped into 6 editorial categories.
// Confidence threshold: 0.85 (matches CONFIDENCE_THRESHOLD constant).
export const DEMO_FIELD_CATEGORIES: ReadonlyArray<FieldCategory> = [
  {
    id: "parties",
    label: "Parties & Premises",
    caption: "Who, where, and how much square footage.",
    fields: [
      { field_name: "Landlord", value: "Brookfield Plaza Holdings LLC", confidence: 0.97, reviewer_edited: false, source_page: 1 },
      { field_name: "Tenant", value: "Halverson & Marks, PLLC", confidence: 0.96, reviewer_edited: false, source_page: 1 },
      { field_name: "Guarantor", value: "Halverson Family Trust", confidence: 0.81, reviewer_edited: false, source_page: 2 },
      { field_name: "Premises Address", value: "1450 Market Street, Suite 2200, San Francisco, CA 94102", confidence: 0.95, reviewer_edited: false, source_page: 1 },
      { field_name: "Rentable Square Feet", value: "12,840 RSF", confidence: 0.93, reviewer_edited: false, source_page: 3 },
      { field_name: "Usable Square Feet", value: "11,265 USF", confidence: 0.78, reviewer_edited: false, source_page: 3 },
    ],
  },
  {
    id: "term",
    label: "Term & Commencement",
    caption: "Lease term, commencement, and expiration anchors.",
    fields: [
      { field_name: "Lease Term", value: "84 months (7 years)", confidence: 0.98, reviewer_edited: false, source_page: 4 },
      { field_name: "Commencement Date", value: "March 1, 2026", confidence: 0.94, reviewer_edited: false, source_page: 4 },
      { field_name: "Rent Commencement", value: "September 1, 2026", confidence: 0.88, reviewer_edited: false, source_page: 4 },
      { field_name: "Expiration Date", value: "February 28, 2033", confidence: 0.94, reviewer_edited: false, source_page: 4 },
      { field_name: "Possession Date", value: "January 15, 2026", confidence: 0.72, reviewer_edited: false, source_page: 5 },
    ],
  },
  {
    id: "rent",
    label: "Base Rent & Escalations",
    caption: "What the tenant pays, how it steps up.",
    fields: [
      { field_name: "Base Rent (Year 1)", value: "$58.00 / RSF / yr", confidence: 0.96, reviewer_edited: false, source_page: 6 },
      { field_name: "Monthly Base Rent (Yr 1)", value: "$62,060.00", confidence: 0.95, reviewer_edited: false, source_page: 6 },
      { field_name: "Escalation Type", value: "Fixed annual step", confidence: 0.91, reviewer_edited: false, source_page: 6 },
      { field_name: "Annual Escalation Rate", value: "3.0%", confidence: 0.93, reviewer_edited: false, source_page: 6 },
      { field_name: "Free Rent / Abatement", value: "6 months full abatement", confidence: 0.79, reviewer_edited: false, source_page: 7 },
    ],
  },
  {
    id: "nnn",
    label: "Operating Expenses (NNN / CAM)",
    caption: "Pass-throughs, base years, and stop amounts.",
    fields: [
      { field_name: "Expense Structure", value: "Modified Gross with base year stop", confidence: 0.90, reviewer_edited: false, source_page: 9 },
      { field_name: "Base Year (Operating)", value: "Calendar Year 2026", confidence: 0.94, reviewer_edited: false, source_page: 9 },
      { field_name: "Base Year (Tax)", value: "Calendar Year 2026", confidence: 0.92, reviewer_edited: false, source_page: 9 },
      { field_name: "Tenant Pro-Rata Share", value: "4.62%", confidence: 0.88, reviewer_edited: false, source_page: 10 },
      { field_name: "CAM Cap (annual)", value: "5.0% non-controllable / cap on controllables", confidence: 0.66, reviewer_edited: false, source_page: 10 },
    ],
  },
  {
    id: "options",
    label: "Options & Rights",
    caption: "Extension, termination, expansion, and ROFR.",
    fields: [
      { field_name: "Option to Extend", value: "Two (2) five-year options", confidence: 0.92, reviewer_edited: false, source_page: 14 },
      { field_name: "Extension Notice Window", value: "12-18 months prior to expiration", confidence: 0.74, reviewer_edited: false, source_page: 14 },
      { field_name: "Renewal Rent Basis", value: "Fair Market Rent, 95% floor", confidence: 0.81, reviewer_edited: false, source_page: 14 },
      { field_name: "Termination Right", value: "Tenant-only, end of month 60, 9-mo notice", confidence: 0.68, reviewer_edited: false, source_page: 15 },
      { field_name: "Right of First Refusal", value: "Adjacent Suite 2150 (8,200 RSF)", confidence: 0.86, reviewer_edited: false, source_page: 16 },
    ],
  },
  {
    id: "obligations",
    label: "Security, Insurance & Misc.",
    caption: "Deposit, insurance, brokerage, governing law.",
    fields: [
      { field_name: "Security Deposit", value: "$186,180 (3 months base rent)", confidence: 0.95, reviewer_edited: false, source_page: 18 },
      { field_name: "Letter of Credit", value: "Step-down to 1 month after Yr 3", confidence: 0.77, reviewer_edited: false, source_page: 18 },
      { field_name: "Liability Insurance Required", value: "$5,000,000 per occurrence", confidence: 0.92, reviewer_edited: false, source_page: 21 },
      { field_name: "Brokerage Commission", value: "5.5% of aggregate base rent", confidence: 0.83, reviewer_edited: false, source_page: 24 },
      { field_name: "Governing Law", value: "State of California", confidence: 0.97, reviewer_edited: false, source_page: 26 },
    ],
  },
];

// Flatten helper — used by the review queue and counters.
export function flattenDemoFields(): DemoAbstractField[] {
  return DEMO_FIELD_CATEGORIES.flatMap((c) => c.fields);
}

export const DEMO_ABSTRACT: AbstractRow = {
  id: "demo-1",
  user_id: "demo-user-id",
  pdf_url: "/demo-leases/halverson-marks-q1-2026.pdf",
  status: "ready",
  extraction_duration_ms: 87_320,
  created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  approved_at: null,
};

// Confidence threshold for review-queue routing.
// Matches the b-05/b-06 spec and field_high_confidence event trigger.
export const CONFIDENCE_THRESHOLD = 0.85;
