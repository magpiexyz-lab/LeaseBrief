-- LeaseBrief: track activation + nudge state on the users table.
--
-- The email/nudge cron (src/app/api/email/nudge/route.ts) needs to identify
-- users who:
--   - signed up > 24h ago (users.created_at)
--   - haven't completed their first abstract approval (activated_at IS NULL)
--   - haven't yet been nudged (nudge_sent_at IS NULL)
-- See email/resend.md → "Database Requirements".

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz;

-- Both columns are mutated only by server-side flows (the approve action
-- sets activated_at via the service role; the nudge cron sets
-- nudge_sent_at). Existing service-role-only write posture on users (no
-- client INSERT / UPDATE policies) covers them.

-- ─── exports ledger ─────────────────────────────────────────────────────
-- One row per CSV export. Backs the free-tier "3 exports per abstract"
-- watermark check in src/app/api/export/route.ts (b-08).
CREATE TABLE IF NOT EXISTS exports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abstract_id  uuid NOT NULL REFERENCES abstracts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format       text NOT NULL CHECK (format IN ('yardi', 'mri', 'appfolio')),
  plan         text NOT NULL CHECK (plan IN ('free', 'pro')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Users may read their own export history (the export page surfaces
-- existing_export_count and the watermark state).
DROP POLICY IF EXISTS "exports_select_own" ON exports;
CREATE POLICY "exports_select_own" ON exports
  FOR SELECT USING (auth.uid() = user_id);

-- Writes are service-role-only (the export route uses createServerSupabaseClient
-- for now, but the insert is wrapped in try/catch so RLS rejection is
-- graceful). When the export route migrates to the service-role client, the
-- absence of an INSERT policy enforces the boundary at the DB layer.

