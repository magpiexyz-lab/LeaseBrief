import type { Metadata } from "next";
import { ReviewQueueClient } from "./ReviewQueueClient";
import { DEMO_QUEUE_ROWS } from "./queue-data";

// Review queue lives behind auth in production — RLS-scoped to the current
// user. Marking dynamic ensures the route is never prerendered with stale
// or empty data. (Auth wiring is added by scaffold-wire post-fan-out.)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review queue · LeaseBrief",
  description:
    "Every field the AI flagged below 85% confidence across your open lease abstracts. Confirm or correct each value to lock the abstract for export.",
};

export default async function ReviewQueuePage() {
  // DEMO_MODE / placeholder Supabase path serves the canonical demo rows.
  // Real implementation: server-side join across abstract_fields filtered
  // by confidence < 0.85, scoped by RLS to the current user.
  const initialRows = DEMO_QUEUE_ROWS;

  return (
    <ReviewQueueClient
      initialRows={initialRows}
      emptyStateImagePath="/images/empty-state.webp"
    />
  );
}
