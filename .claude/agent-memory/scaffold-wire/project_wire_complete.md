---
name: project-wire-complete
description: LeaseBrief BG2-WIRE postconditions — what scaffold-wire produced for the leasebrief bootstrap on 2026-05-21
metadata:
  type: project
---

LeaseBrief bootstrap reached BG2-WIRE postconditions on 2026-05-21.

**Why:** the bootstrap lead needed scaffold-wire to satisfy three BG2-WIRE
gate checks (check 1: nav-bar `DERIVED-FROM: derive_scope_pages` marker;
check 2: layout.tsx imports both NavBar + RetainTracker; check 3:
`npm run build` exits 0) before proceeding to states 15–19b.

**How to apply:** future scaffold-wire runs on similar Next.js + Supabase +
Stripe + Resend stacks can mirror the file inventory in
`.runs/agent-traces/scaffold-wire.json`. Project-specific quirks worth
remembering:

- **b-04 is a STUB**: `/api/abstract` synthesizes 30 mock fields with 24 above
  and 6 below the 0.85 confidence threshold (deterministic via index-keyed
  pseudo-random). Real LLM extraction would replace `mockFields()` only — the
  persistence + analytics + state-transition scaffolding stays the same.
- **Export CSV column mapping**: `/api/export/route.ts` does a best-effort
  lower-snake_case header→field_name match, then falls back to a synonym
  table for Yardi/MRI/AppFolio header variants. Ground-truth FIELD_NAMES
  live in `/api/abstract/route.ts`; the per-format column specs live in
  `src/app/export/columns.ts`.
- **Skip-nav target**: the layout uses a `<div id="main-content">` wrapper
  (not `<main>`) because every route owns its own `<main>` landmark. Adding
  another in layout produces duplicate-main axe violations.
- **NavBar route suppression**: AUTH_ROUTES + MARKETING_ROUTE_PREFIXES make
  NavBar return `null` on `/`, `/login`, `/signup`, `/auth/*`, and `/v/*`.
  Without this every variant landing ships with two stacked top bars.
- **Welcome email enqueue from Stripe webhook**: the webhook does a fire-and-
  forget `fetch` to `/api/email/welcome-webhook` with an HMAC-signed payload
  synthesized from `session.customer_details`. Failure logs but does NOT
  regress the user's plan or cause Stripe to retry.
- **Migration numbering**: 001_initial + 002_stripe_events already existed;
  this phase added 003_users_email_tracking.sql (activated_at +
  nudge_sent_at columns on users; exports ledger table).
- **Auth-routing.json**: written via `.claude/scripts/lib/auth_routing.py`;
  for this bootstrap `demo_mode_role=None` (Supabase auth has no role-gated
  demo paths) and 0 unreachable routes.
- **Atomic-rename gotcha on Windows**: `write-agent-trace.sh` fails if the
  init-trace.py stub is still locked by another process. Remove the stub
  first if you see `FileExistsError WinError 183` and re-run.
