-- Stripe webhook idempotency table.
-- Uses INSERT + catch PG 23505 (unique_violation) pattern for atomic dedup.
-- See .claude/stacks/payment/stripe.md "Idempotency migration" section.

CREATE TABLE IF NOT EXISTS stripe_events (
  stripe_event_id  text PRIMARY KEY,
  received_at      timestamptz NOT NULL DEFAULT now()
);

-- Only the service role writes to this table (webhook handler uses createServiceRoleClient).
-- No RLS-exposed access from clients.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role writes stripe events" ON stripe_events;
CREATE POLICY "service role writes stripe events"
  ON stripe_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
