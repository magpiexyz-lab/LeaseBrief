import { track } from "./analytics";

// --- Event funnel stage map (generated from experiment/EVENTS.yaml) ---

export const EVENT_FUNNEL_MAP: Record<string, string> = {
  landing_view: "reach",
  qualified_paid_visit: "reach",
  cta_click: "demand",
  signup_start: "activate",
  signup_complete: "activate",
  abstract_started: "activate",
  field_extracted: "activate",
  field_high_confidence: "activate",
  abstract_view: "activate",
  review_field_edited: "activate",
  abstract_completed: "activate",
  checkout_started: "monetize",
  checkout_completed: "monetize",
  abstract_exported: "monetize",
  retain_return: "retain",
} as const;

// --- Event wrappers (generated from experiment/EVENTS.yaml events map) ---

// REACH

export function trackLandingView(props?: {
  variant?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}) {
  track("landing_view", { ...props, funnel_stage: "reach" });
}

export function trackQualifiedPaidVisit(props: {
  source_channel: string;
  variant?: string;
}) {
  track("qualified_paid_visit", { ...props, funnel_stage: "reach" });
}

// DEMAND

export function trackCtaClick(props?: {
  variant?: string;
  cta_position?: string;
}) {
  track("cta_click", { ...props, funnel_stage: "demand" });
}

// ACTIVATE

export function trackSignupStart(props?: {
  auth_method?: string;
}) {
  track("signup_start", { ...props, funnel_stage: "activate" });
}

export function trackSignupComplete(props: {
  auth_method: string;
}) {
  track("signup_complete", { ...props, funnel_stage: "activate" });
}

export function trackAbstractStarted(props: {
  abstract_id: string;
  file_size_kb: number;
  file_pages?: number;
}) {
  track("abstract_started", { ...props, funnel_stage: "activate" });
}

export function trackFieldExtracted(props: {
  abstract_id: string;
  field_name: string;
  confidence: number;
}) {
  track("field_extracted", { ...props, funnel_stage: "activate" });
}

export function trackFieldHighConfidence(props: {
  abstract_id: string;
  field_name: string;
  confidence: number;
}) {
  track("field_high_confidence", { ...props, funnel_stage: "activate" });
}

export function trackAbstractView(props: {
  abstract_id: string;
  extraction_duration_ms?: number;
}) {
  track("abstract_view", { ...props, funnel_stage: "activate" });
}

export function trackReviewFieldEdited(props: {
  abstract_id: string;
  field_name: string;
  original_confidence: number;
}) {
  track("review_field_edited", { ...props, funnel_stage: "activate" });
}

export function trackAbstractCompleted(props: {
  abstract_id: string;
  review_fields_edited: number;
  extraction_duration_ms?: number;
}) {
  track("abstract_completed", { ...props, funnel_stage: "activate" });
}

// --- Payment events (only when requires: [payment] matched) ---

export function trackCheckoutStarted(props: {
  abstract_count_at_upgrade: number;
  variant?: string;
}) {
  track("checkout_started", { ...props, funnel_stage: "monetize" });
}

// Waitlist signup — used while self-serve checkout is disabled. Captures
// purchase intent so we can email users when checkout goes live. Fires
// `pro_waitlist_joined` (custom monetize-stage event).
export function trackProWaitlistJoined(props: {
  email: string;
  source: "pricing" | "dashboard";
  abstract_count_at_upgrade?: number;
}) {
  track("pro_waitlist_joined", { ...props, funnel_stage: "monetize" });
}

export function trackCheckoutCompleted(props: {
  plan: string;
  amount_usd: number;
}) {
  track("checkout_completed", { ...props, funnel_stage: "monetize" });
}

export function trackAbstractExported(props: {
  abstract_id: string;
  format: string;
  plan_at_export: string;
}) {
  track("abstract_exported", { ...props, funnel_stage: "monetize" });
}

// RETAIN

export function trackRetainReturn(props: {
  days_since_first: number;
  has_completed_abstract?: boolean;
}) {
  track("retain_return", { ...props, funnel_stage: "retain" });
}
