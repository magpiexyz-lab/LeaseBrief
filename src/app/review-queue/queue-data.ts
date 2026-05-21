// Demo data for /review-queue — aggregates low-confidence (<0.85) fields
// across all open abstracts the user can see. Real data comes from a
// server-side join (abstract_fields filtered by confidence < 0.85 and
// reviewer_edited = false) wired by scaffold-wire post-fan-out.

import { CONFIDENCE_THRESHOLD } from "@/app/abstract/[id]/demo-data";

export { CONFIDENCE_THRESHOLD };

export type QueueRow = {
  id: string;                  // composite key (abstract_id + field_name)
  abstract_id: string;
  abstract_label: string;      // tenant + suite, for context
  field_name: string;
  value: string;
  confidence: number;
  source_page: number | null;
  category: string;
  reviewer_edited: boolean;
};

// 8 demo rows spanning 3 abstracts — gives the queue real density without
// looking templated. Categories cross-reference the abstract-detail spec.
export const DEMO_QUEUE_ROWS: ReadonlyArray<QueueRow> = [
  {
    id: "demo-1::Guarantor",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "Guarantor",
    value: "Halverson Family Trust",
    confidence: 0.81,
    source_page: 2,
    category: "Parties & Premises",
    reviewer_edited: false,
  },
  {
    id: "demo-1::Usable Square Feet",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "Usable Square Feet",
    value: "11,265 USF",
    confidence: 0.78,
    source_page: 3,
    category: "Parties & Premises",
    reviewer_edited: false,
  },
  {
    id: "demo-1::Possession Date",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "Possession Date",
    value: "January 15, 2026",
    confidence: 0.72,
    source_page: 5,
    category: "Term & Commencement",
    reviewer_edited: false,
  },
  {
    id: "demo-1::Free Rent / Abatement",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "Free Rent / Abatement",
    value: "6 months full abatement",
    confidence: 0.79,
    source_page: 7,
    category: "Base Rent & Escalations",
    reviewer_edited: false,
  },
  {
    id: "demo-1::CAM Cap (annual)",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "CAM Cap (annual)",
    value: "5.0% non-controllable / cap on controllables",
    confidence: 0.66,
    source_page: 10,
    category: "Operating Expenses",
    reviewer_edited: false,
  },
  {
    id: "demo-1::Extension Notice Window",
    abstract_id: "demo-1",
    abstract_label: "Halverson & Marks · 1450 Market St",
    field_name: "Extension Notice Window",
    value: "12-18 months prior to expiration",
    confidence: 0.74,
    source_page: 14,
    category: "Options & Rights",
    reviewer_edited: false,
  },
  {
    id: "demo-2::Termination Fee",
    abstract_id: "demo-2",
    abstract_label: "Cobalt Diagnostics · 88 Howard Plaza",
    field_name: "Termination Fee",
    value: "Unamortized TI + 4 months base rent",
    confidence: 0.61,
    source_page: 18,
    category: "Options & Rights",
    reviewer_edited: false,
  },
  {
    id: "demo-3::Operating Hours",
    abstract_id: "demo-3",
    abstract_label: "Northwind Capital · 200 California, 14F",
    field_name: "Operating Hours",
    value: "7am–7pm weekdays, after-hours $35/hr HVAC",
    confidence: 0.69,
    source_page: 22,
    category: "Security, Insurance & Misc.",
    reviewer_edited: false,
  },
];
