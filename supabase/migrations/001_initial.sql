-- LeaseBrief initial schema
-- Tables: users, abstracts, abstract_fields
-- All tables have RLS enabled.
-- users and abstracts use the default _own RLS pattern (auth.uid() = user_id).
-- abstract_fields inherits access through parent abstract ownership.
-- abstracts.status and abstract_fields.confidence are state-machine / precision
-- columns mutated only by server-side flows (extraction job, webhook) — writes
-- are gated via the service-role client; only SELECT is exposed to user clients.

-- ─── users ──────────────────────────────────────────────────────────────────
-- Extends auth.users with plan metadata and Stripe billing state.
-- plan and stripe_customer_id are mutated only by the Stripe webhook handler
-- (b-09) via the service-role client, so we use service-role-only writes.
CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text NOT NULL,
  plan                text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id  text,
  quota_monthly       integer,
  current_period_end  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users may read their own row.
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Service-role-only writes: plan, stripe_customer_id, quota_monthly,
-- current_period_end are mutated by the Stripe webhook — no client INSERT/UPDATE.
-- Initial user row is created server-side from the auth.user.created webhook.

-- ─── abstracts ──────────────────────────────────────────────────────────────
-- One row per uploaded lease PDF. Status transitions: processing → ready → approved.
-- status and extraction_duration_ms are mutated only by the AI extraction job (b-04)
-- and the approve action (b-05) via server-side routes.
CREATE TABLE IF NOT EXISTS abstracts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pdf_url                 text,
  status                  text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'approved')),
  extraction_duration_ms  integer,
  created_at              timestamptz NOT NULL DEFAULT now(),
  approved_at             timestamptz
);

ALTER TABLE abstracts ENABLE ROW LEVEL SECURITY;

-- Users may read their own abstracts.
DROP POLICY IF EXISTS "abstracts_select_own" ON abstracts;
CREATE POLICY "abstracts_select_own" ON abstracts
  FOR SELECT USING (auth.uid() = user_id);

-- Users may create abstracts for themselves (upload triggers row creation).
DROP POLICY IF EXISTS "abstracts_insert_own" ON abstracts;
CREATE POLICY "abstracts_insert_own" ON abstracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service-role-only updates: status, extraction_duration_ms, approved_at are
-- mutated by server-side routes (extraction job, approve action).
-- No client-side UPDATE policy.

-- ─── abstract_fields ────────────────────────────────────────────────────────
-- 30 rows per abstract (one per extracted field).
-- confidence is in [0, 1]; reviewer_edited marks human corrections.
-- Writes (INSERT, UPDATE) are service-role-only except reviewer_edited edits
-- from the review queue (b-06), which update via the server-side review route.
CREATE TABLE IF NOT EXISTS abstract_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abstract_id     uuid NOT NULL REFERENCES abstracts(id) ON DELETE CASCADE,
  field_name      text NOT NULL,
  value           text,
  confidence      numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reviewer_edited boolean NOT NULL DEFAULT false,
  source_page     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE abstract_fields ENABLE ROW LEVEL SECURITY;

-- Users may read fields belonging to their own abstracts.
DROP POLICY IF EXISTS "abstract_fields_select_own" ON abstract_fields;
CREATE POLICY "abstract_fields_select_own" ON abstract_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM abstracts
      WHERE abstracts.id = abstract_fields.abstract_id
        AND abstracts.user_id = auth.uid()
    )
  );

-- Service-role-only INSERT/UPDATE for extraction job writes (b-04) and
-- review queue edits (b-06 uses the server-side route).
-- No direct client-side INSERT or UPDATE policies.
