// Database row + API contract types for LeaseBrief.
// Naming convention:
//   - XxxRow — table shape returned by Supabase queries.
//   - XxxRequest / XxxResponse — API contract shapes derived from the
//     exported Zod schemas / response types in src/app/api/**/route.ts.
// See procedures/wire.md Step 6.
//
// Dependency direction: route.ts ← types.ts ← page.tsx. Pages import API
// types from here; routes export schemas but never import from here.

import { z } from "zod";
import { abstractSchema } from "@/app/api/abstract/route";
import { checkoutSchema } from "@/app/api/checkout/route";
import { welcomeSchema } from "@/app/api/email/welcome/route";
import { exportQuerySchema } from "@/app/api/export/route";
export type { CreateAbstractResponse } from "@/app/api/abstract/route";
export type { CreateCheckoutResponse } from "@/app/api/checkout/route";
export type { WelcomeEmailResponse } from "@/app/api/email/welcome/route";

export type CreateAbstractRequest = z.infer<typeof abstractSchema>;
export type CreateCheckoutRequest = z.infer<typeof checkoutSchema>;
export type WelcomeEmailRequest = z.infer<typeof welcomeSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;


export type UserPlan = "free" | "pro";

export type UserRow = {
  id: string;                       // uuid, FK to auth.users
  email: string;
  plan: UserPlan;
  stripe_customer_id: string | null;
  quota_monthly: number | null;     // number of abstracts included in the plan
  current_period_end: string | null; // ISO timestamptz
  created_at: string;               // ISO timestamptz
};

export type AbstractStatus = "processing" | "ready" | "approved";

export type AbstractRow = {
  id: string;                        // uuid
  user_id: string;                   // uuid, FK to users
  pdf_url: string | null;            // Supabase storage path
  status: AbstractStatus;
  extraction_duration_ms: number | null;
  created_at: string;                // ISO timestamptz
  approved_at: string | null;        // ISO timestamptz
};

export type AbstractFieldRow = {
  id: string;                        // uuid
  abstract_id: string;               // uuid, FK to abstracts
  field_name: string;                // e.g., base_rent, escalation_type, nnn_pass_through
  value: string | null;
  confidence: number;                // numeric in [0, 1]
  reviewer_edited: boolean;          // default false
  source_page: number | null;        // PDF page reference
  created_at: string;                // ISO timestamptz
};

export type StripeEventRow = {
  stripe_event_id: string;           // Stripe event ID (primary key, for idempotency)
  received_at: string;               // ISO timestamptz
};
