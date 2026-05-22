import { describe, it, expect, beforeEach, vi } from "vitest";

// b-07 — POST /api/checkout creates a Stripe Checkout session for the Pro
// plan and returns { url } for client redirect.
//
// Acceptance criteria (from task spec):
//   1. Auth required (401 when no Supabase user)
//   2. Rate-limited (429 on Nth+1 burst within the window)
//   3. Calls stripe.checkout.sessions.create with success_url/cancel_url
//      shape and the expected unit_amount (priceId equivalent — Pro = 1900¢)
//   4. Returns { url } from the Stripe session
//   5. Fires server-side `checkout_started` via trackServerEvent

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const {
  trackServerEventMock,
  getUserMock,
  createServerSupabaseClientMock,
  rateLimitMock,
  clientIpFromHeadersMock,
  stripeSessionsCreateMock,
  getStripeMock,
} = vi.hoisted(() => ({
  trackServerEventMock: vi.fn(),
  getUserMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  rateLimitMock: vi.fn(),
  clientIpFromHeadersMock: vi.fn(),
  stripeSessionsCreateMock: vi.fn(),
  getStripeMock: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
  // not used by checkout route but kept for safety
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: rateLimitMock,
  clientIpFromHeaders: clientIpFromHeadersMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: getStripeMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────
function setupMocks(opts: {
  authedUserId?: string | null;
  rateLimitSuccess?: boolean;
  stripeSessionUrl?: string | null;
} = {}) {
  const {
    authedUserId = "user-123",
    rateLimitSuccess = true,
    stripeSessionUrl = "https://stripe.test/session/abc",
  } = opts;

  getUserMock.mockResolvedValue({
    data: { user: authedUserId ? { id: authedUserId } : null },
    error: null,
  });
  createServerSupabaseClientMock.mockResolvedValue({
    auth: { getUser: getUserMock },
  });
  rateLimitMock.mockReturnValue({ success: rateLimitSuccess, remaining: rateLimitSuccess ? 9 : 0 });
  clientIpFromHeadersMock.mockReturnValue("198.51.100.7");
  stripeSessionsCreateMock.mockResolvedValue({ url: stripeSessionUrl });
  getStripeMock.mockReturnValue({
    checkout: { sessions: { create: stripeSessionsCreateMock } },
  });
}

function checkoutRequest(body: object = { plan: "pro" }) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  trackServerEventMock.mockReset();
  trackServerEventMock.mockResolvedValue(undefined);
  getUserMock.mockReset();
  createServerSupabaseClientMock.mockReset();
  rateLimitMock.mockReset();
  clientIpFromHeadersMock.mockReset();
  stripeSessionsCreateMock.mockReset();
  getStripeMock.mockReset();
});

describe("POST /api/checkout — auth", () => {
  it("returns 401 when there is no Supabase session", async () => {
    setupMocks({ authedUserId: null });
    const { POST } = await loadRoute();
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/checkout — rate limiting", () => {
  it("returns 429 when rateLimit() reports the burst window is exhausted", async () => {
    setupMocks({ rateLimitSuccess: false });
    const { POST } = await loadRoute();
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(429);
  });
});

describe("POST /api/checkout — Stripe integration", () => {
  it("calls stripe.checkout.sessions.create with the Pro price (1900¢) and proper success/cancel URLs", async () => {
    setupMocks();
    const { POST } = await loadRoute();
    await POST(checkoutRequest());
    expect(stripeSessionsCreateMock).toHaveBeenCalledTimes(1);
    const params = stripeSessionsCreateMock.mock.calls[0][0];
    expect(params.success_url).toMatch(/dashboard\?upgrade=success$/);
    expect(params.cancel_url).toMatch(/pricing\?upgrade=cancelled$/);
    // Pro plan price flows via line_items[0].price_data.unit_amount (1900¢).
    expect(params.line_items[0].price_data.unit_amount).toBe(1900);
    // user_id from the cookie session, NOT from the request body.
    expect(params.metadata.user_id).toBe("user-123");
    expect(params.metadata.plan).toBe("pro");
  });

  it("returns { url } populated from the Stripe session", async () => {
    setupMocks({ stripeSessionUrl: "https://stripe.test/session/xyz" });
    const { POST } = await loadRoute();
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toBe("https://stripe.test/session/xyz");
  });

  it("returns 500 when Stripe creates a session with no url", async () => {
    setupMocks({ stripeSessionUrl: null });
    const { POST } = await loadRoute();
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/checkout — analytics", () => {
  it("fires server-side `checkout_started` via trackServerEvent for the authed user", async () => {
    setupMocks();
    const { POST } = await loadRoute();
    await POST(checkoutRequest());
    const startedCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "checkout_started",
    );
    expect(startedCalls).toHaveLength(1);
    // distinctId = the authed user.
    expect(startedCalls[0][1]).toBe("user-123");
  });
});
