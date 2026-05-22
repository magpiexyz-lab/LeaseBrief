import { describe, it, expect, beforeEach, vi } from "vitest";

// b-03 + b-04 (system actor) — POST /api/abstract is the upload + stub
// AI-extraction route. Tests cover:
//   1. abstracts row is created with status='processing' on a valid PDF upload
//   2. 30 abstract_fields are persisted with confidence in [0, 1]
//   3. 24 fields are high-confidence (>= 0.85), 6 are low-confidence (< 0.85)
//   4. field_extracted fires 30x; field_high_confidence fires 24x
//   5. state transition processing -> ready only when current status === 'processing'
//   6. non-PDF MIME types are rejected with a clear error
//   7. unauthenticated requests are rejected with 401

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const {
  trackServerEventMock,
  getUserMock,
  serverFromMock,
  serviceFromMock,
  createServerSupabaseClientMock,
  createServiceRoleClientMock,
} = vi.hoisted(() => ({
  trackServerEventMock: vi.fn(),
  getUserMock: vi.fn(),
  serverFromMock: vi.fn(),
  serviceFromMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}));

// ─── Test scaffolding helpers ───────────────────────────────────────────────
// `serverFromMock` (the user-scoped client used for auth + initial INSERT into
// abstracts) returns a chainable that supports:
//   .from('abstracts').insert(...).select(...).single() → { data: {id, status}, error }
// `serviceFromMock` (the service-role client used for abstract_fields INSERT
// and the processing→ready UPDATE) returns:
//   .from('abstract_fields').insert([...]) → { error }
//   .from('abstracts').update({...}).eq('id', x) → { error }

interface InsertedFieldRow {
  abstract_id: string;
  field_name: string;
  value: string;
  confidence: number;
  reviewer_edited: boolean;
  source_page: number;
}

let lastInsertedFieldRows: InsertedFieldRow[] = [];
let lastAbstractsUpdate: Record<string, unknown> | null = null;
let lastAbstractsUpdateId: string | null = null;
let abstractInsertReturn: {
  data: { id: string; status: string } | null;
  error: { message: string } | null;
} = { data: { id: "abs-uuid-1", status: "processing" }, error: null };
// Quota-gate state (read by the new users + abstracts-count queries the route
// runs before parsing the multipart body).
let userRowReturn: {
  data: { plan: "free" | "pro"; quota_monthly: number | null } | null;
  error: { message: string } | null;
} = { data: { plan: "free", quota_monthly: 3 }, error: null };
let abstractsMonthlyCountReturn: {
  count: number;
  error: { message: string } | null;
} = { count: 0, error: null };

function setupClientMocks(options: {
  authedUserId?: string | null;
  fieldsInsertError?: { message: string } | null;
  updateError?: { message: string } | null;
  abstractInsertOverride?: typeof abstractInsertReturn;
  userRowOverride?: typeof userRowReturn;
  monthlyCountOverride?: typeof abstractsMonthlyCountReturn;
} = {}) {
  const {
    authedUserId = "user-abc",
    fieldsInsertError = null,
    updateError = null,
  } = options;

  if (options.abstractInsertOverride) {
    abstractInsertReturn = options.abstractInsertOverride;
  } else {
    abstractInsertReturn = { data: { id: "abs-uuid-1", status: "processing" }, error: null };
  }
  if (options.userRowOverride) {
    userRowReturn = options.userRowOverride;
  } else {
    userRowReturn = { data: { plan: "free", quota_monthly: 3 }, error: null };
  }
  if (options.monthlyCountOverride) {
    abstractsMonthlyCountReturn = options.monthlyCountOverride;
  } else {
    abstractsMonthlyCountReturn = { count: 0, error: null };
  }

  getUserMock.mockResolvedValue({
    data: { user: authedUserId ? { id: authedUserId } : null },
    error: null,
  });

  // Server client supports three call shapes:
  //   .from('users').select(...).eq(...).maybeSingle() — quota lookup
  //   .from('abstracts').select(..., {count:'exact',head:true}).eq(...).gte(...) — monthly count
  //   .from('abstracts').insert(...).select(...).single() — initial INSERT
  serverFromMock.mockImplementation((table: string) => {
    if (table === "users") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(userRowReturn),
          }),
        }),
      };
    }
    if (table === "abstracts") {
      return {
        // Count query: select('id', {count:'exact', head:true}).eq().gte()
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve(abstractsMonthlyCountReturn),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(abstractInsertReturn),
          }),
        }),
      };
    }
    throw new Error(`unexpected server-client table read: ${table}`);
  });

  createServerSupabaseClientMock.mockResolvedValue({
    auth: { getUser: getUserMock },
    from: serverFromMock,
  });

  // Service-role client
  serviceFromMock.mockImplementation((table: string) => {
    if (table === "abstract_fields") {
      return {
        insert: (rows: InsertedFieldRow[]) => {
          lastInsertedFieldRows = rows;
          return Promise.resolve({ error: fieldsInsertError });
        },
      };
    }
    if (table === "abstracts") {
      return {
        update: (payload: Record<string, unknown>) => {
          lastAbstractsUpdate = payload;
          return {
            eq: (_col: string, id: string) => {
              lastAbstractsUpdateId = id;
              return Promise.resolve({ error: updateError });
            },
          };
        },
      };
    }
    if (table === "users") {
      // Bootstrap upsert path — make it a no-op for tests.
      return {
        upsert: (_payload: Record<string, unknown>) =>
          Promise.resolve({ error: null }),
      };
    }
    throw new Error(`unexpected service-client table: ${table}`);
  });

  createServiceRoleClientMock.mockReturnValue({ from: serviceFromMock });
}

// Build a multipart-form Request the way Next.js receives it. Using the
// standard Web FormData/Request keeps us framework-agnostic.
function pdfRequest(opts: { mime?: string; name?: string; bytes?: number } = {}) {
  const { mime = "application/pdf", name = "lease.pdf", bytes = 1024 } = opts;
  const fd = new FormData();
  const buf = new Uint8Array(bytes);
  buf.fill(65);
  fd.append("file", new File([buf], name, { type: mime }));
  return new Request("http://localhost/api/abstract", {
    method: "POST",
    body: fd,
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
  serverFromMock.mockReset();
  serviceFromMock.mockReset();
  createServerSupabaseClientMock.mockReset();
  createServiceRoleClientMock.mockReset();
  lastInsertedFieldRows = [];
  lastAbstractsUpdate = null;
  lastAbstractsUpdateId = null;
});

describe("POST /api/abstract — auth", () => {
  it("returns 401 when no Supabase user is present", async () => {
    setupClientMocks({ authedUserId: null });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect([401, 403]).toContain(res.status);
  });
});

describe("POST /api/abstract — monthly quota gate", () => {
  it("returns 402 when a free-tier user has already used 3 abstracts this month", async () => {
    setupClientMocks({
      userRowOverride: { data: { plan: "free", quota_monthly: 3 }, error: null },
      monthlyCountOverride: { count: 3, error: null },
    });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(402);
    const body = (await res.json()) as {
      error: string;
      current_count: number;
      quota: number;
      plan: string;
    };
    expect(body.error).toBe("Monthly quota reached");
    expect(body.current_count).toBe(3);
    expect(body.quota).toBe(3);
    expect(body.plan).toBe("free");
  });

  it("returns 402 when a pro-tier user has already used 50 abstracts this month", async () => {
    setupClientMocks({
      userRowOverride: { data: { plan: "pro", quota_monthly: 50 }, error: null },
      monthlyCountOverride: { count: 50, error: null },
    });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(402);
    const body = (await res.json()) as { plan: string; quota: number };
    expect(body.plan).toBe("pro");
    expect(body.quota).toBe(50);
  });

  it("falls back to 3-abstract free tier when no users row exists yet", async () => {
    setupClientMocks({
      userRowOverride: { data: null, error: null },
      monthlyCountOverride: { count: 3, error: null },
    });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(402);
    const body = (await res.json()) as { quota: number; plan: string };
    expect(body.quota).toBe(3);
    expect(body.plan).toBe("free");
  });

  it("allows the upload when the user is still under quota", async () => {
    setupClientMocks({
      userRowOverride: { data: { plan: "free", quota_monthly: 3 }, error: null },
      monthlyCountOverride: { count: 2, error: null },
    });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(201);
  });
});

describe("POST /api/abstract — input validation", () => {
  it("rejects non-PDF MIME types with a clear error", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest({ mime: "image/png", name: "not-a-lease.png" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/PDF/i);
  });
});

describe("POST /api/abstract — b-03 abstracts row creation", () => {
  it("creates an abstracts row with status='processing' on valid PDF upload", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(201);
    const body = (await res.json()) as { abstract_id: string };
    expect(body.abstract_id).toBe("abs-uuid-1");
    // serverFromMock was called against 'abstracts' (initial insert).
    expect(serverFromMock).toHaveBeenCalledWith("abstracts");
  });
});

describe("POST /api/abstract — b-04 stub AI extraction", () => {
  it("persists 30 mock field rows to abstract_fields with confidence in [0,1]", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    await POST(pdfRequest());
    expect(lastInsertedFieldRows).toHaveLength(30);
    for (const f of lastInsertedFieldRows) {
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
      expect(f.abstract_id).toBe("abs-uuid-1");
      expect(typeof f.field_name).toBe("string");
    }
  });

  it("synthesizes 24 high-confidence fields (>= 0.85) and 6 low-confidence (< 0.85)", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    await POST(pdfRequest());
    const high = lastInsertedFieldRows.filter((f) => f.confidence >= 0.85);
    const low = lastInsertedFieldRows.filter((f) => f.confidence < 0.85);
    expect(high).toHaveLength(24);
    expect(low).toHaveLength(6);
  });

  it("fires field_extracted exactly 30x", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    await POST(pdfRequest());
    const extracted = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "field_extracted",
    );
    expect(extracted).toHaveLength(30);
  });

  it("fires field_high_confidence only for fields with confidence >= 0.85 (24 calls)", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    await POST(pdfRequest());
    const hiCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "field_high_confidence",
    );
    expect(hiCalls).toHaveLength(24);
    // Every high-confidence event's confidence property must be >= 0.85.
    for (const call of hiCalls) {
      const props = call[2] as { confidence: number };
      expect(props.confidence).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe("POST /api/abstract — state transition guard", () => {
  it("transitions abstracts.status from 'processing' to 'ready' after successful extraction", async () => {
    setupClientMocks();
    const { POST } = await loadRoute();
    await POST(pdfRequest());
    expect(lastAbstractsUpdate).not.toBeNull();
    expect((lastAbstractsUpdate as { status?: string }).status).toBe("ready");
    expect(lastAbstractsUpdateId).toBe("abs-uuid-1");
  });

  it("refuses to transition if the inserted abstract is not in status='processing' (409)", async () => {
    setupClientMocks({
      abstractInsertOverride: {
        data: { id: "abs-uuid-1", status: "ready" }, // not processing
        error: null,
      },
    });
    const { POST } = await loadRoute();
    const res = await POST(pdfRequest());
    expect(res.status).toBe(409);
  });
});
