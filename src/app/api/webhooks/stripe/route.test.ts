import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// b-09 (system actor) — POST /api/webhooks/stripe
//
// Tests:
//   1. Missing signature → 400
//   2. Invalid signature (constructEvent throws) → 400
//   3. Valid `checkout.session.completed` upserts users.plan='pro' and
//      sets stripe_customer_id; fires server-side `checkout_completed`
//   4. Idempotency: stripe_events INSERT 23505 → 200 without re-applying
//   5. Welcome email is enqueued (HMAC-signed POST to welcome-webhook)

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const {
  trackServerEventMock,
  constructEventMock,
  getStripeMock,
  createServiceRoleClientMock,
  stripeEventsInsertMock,
  usersUpdateMock,
  fetchMock,
} = vi.hoisted(() => ({
  trackServerEventMock: vi.fn(),
  constructEventMock: vi.fn(),
  getStripeMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
  stripeEventsInsertMock: vi.fn(),
  usersUpdateMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: getStripeMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: createServiceRoleClientMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────
function setupServiceClient(opts: {
  stripeEventsInsertError?: { code?: string; message: string } | null;
  usersUpdateError?: { message: string } | null;
} = {}) {
  const { stripeEventsInsertError = null, usersUpdateError = null } = opts;

  stripeEventsInsertMock.mockImplementation((payload: { stripe_event_id: string }) => {
    void payload;
    return Promise.resolve({ error: stripeEventsInsertError });
  });
  usersUpdateMock.mockImplementation((payload: Record<string, unknown>) => {
    void payload;
    return {
      eq: (_col: string, _val: string) =>
        Promise.resolve({ error: usersUpdateError }),
    };
  });

  createServiceRoleClientMock.mockReturnValue({
    from: (table: string) => {
      if (table === "stripe_events") return { insert: stripeEventsInsertMock };
      if (table === "users") return { update: usersUpdateMock };
      throw new Error(`unexpected table: ${table}`);
    },
  });
}

function webhookRequest(body: string, opts: { signature?: string | null } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (opts.signature !== null) {
    headers.set("stripe-signature", opts.signature ?? "valid-sig-stub");
  }
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  trackServerEventMock.mockReset();
  trackServerEventMock.mockResolvedValue(undefined);
  constructEventMock.mockReset();
  getStripeMock.mockReset();
  getStripeMock.mockReturnValue({
    webhooks: { constructEvent: constructEventMock },
  });
  createServiceRoleClientMock.mockReset();
  stripeEventsInsertMock.mockReset();
  usersUpdateMock.mockReset();
  fetchMock.mockReset();
  // Replace global fetch for welcome-email enqueue path.
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true });
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.SUPABASE_WEBHOOK_SECRET = "test_webhook_secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/webhooks/stripe — signature verification", () => {
  it("returns 400 when the stripe-signature header is missing", async () => {
    setupServiceClient();
    const { POST } = await loadRoute();
    const res = await POST(webhookRequest("{}", { signature: null }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    setupServiceClient();
    constructEventMock.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const { POST } = await loadRoute();
    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/webhooks/stripe — checkout.session.completed", () => {
  function validEvent(overrides: Partial<{
    id: string;
    userId: string;
    customer: string | null;
    email: string | null;
  }> = {}) {
    return {
      id: overrides.id ?? "evt_test_123",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: {
            user_id: overrides.userId ?? "user-456",
            plan: "pro",
            amount_cents: "9900",
          },
          customer: overrides.customer ?? "cus_TEST",
          customer_details:
            overrides.email !== null
              ? { email: overrides.email ?? "alice@example.com", name: "Alice" }
              : null,
        },
      },
    };
  }

  it("upserts users.plan='pro' with stripe_customer_id and fires checkout_completed", async () => {
    setupServiceClient();
    constructEventMock.mockReturnValue(validEvent());
    const { POST } = await loadRoute();
    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    // users.update was called with plan='pro' + stripe_customer_id.
    expect(usersUpdateMock).toHaveBeenCalledTimes(1);
    const updatePayload = usersUpdateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload.plan).toBe("pro");
    expect(updatePayload.stripe_customer_id).toBe("cus_TEST");

    // server-side checkout_completed fired with the user's distinctId.
    const completedCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "checkout_completed",
    );
    expect(completedCalls).toHaveLength(1);
    expect(completedCalls[0][1]).toBe("user-456");
  });

  it("enqueues the welcome email via HMAC-signed fetch to /api/email/welcome-webhook", async () => {
    setupServiceClient();
    constructEventMock.mockReturnValue(validEvent({ email: "alice@example.com" }));
    const { POST } = await loadRoute();
    await POST(webhookRequest("{}"));

    const welcomeCall = fetchMock.mock.calls.find((c) => {
      const url = c[0] as string;
      return typeof url === "string" && url.endsWith("/api/email/welcome-webhook");
    });
    expect(welcomeCall).toBeDefined();
    const init = welcomeCall![1] as { headers: Record<string, string>; body: string };
    // Must carry the HMAC signature header.
    expect(init.headers["x-webhook-signature"]).toMatch(/^[0-9a-f]+$/);
    const payload = JSON.parse(init.body) as { record: { email: string } };
    expect(payload.record.email).toBe("alice@example.com");
  });
});

describe("POST /api/webhooks/stripe — idempotency", () => {
  it("treats a replayed event.id (PG 23505 unique violation) as success without re-applying", async () => {
    setupServiceClient({
      stripeEventsInsertError: { code: "23505", message: "duplicate key" },
    });
    constructEventMock.mockReturnValue({
      id: "evt_replay_42",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { user_id: "user-456", plan: "pro", amount_cents: "9900" },
          customer: "cus_REPLAY",
          customer_details: { email: "alice@example.com", name: "Alice" },
        },
      },
    });
    const { POST } = await loadRoute();
    const res = await POST(webhookRequest("{}"));

    expect(res.status).toBe(200);
    // CRITICAL — users.update must NOT be called on replay.
    expect(usersUpdateMock).not.toHaveBeenCalled();
    // CRITICAL — checkout_completed must NOT be re-fired on replay.
    const completedCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "checkout_completed",
    );
    expect(completedCalls).toHaveLength(0);
  });
});
