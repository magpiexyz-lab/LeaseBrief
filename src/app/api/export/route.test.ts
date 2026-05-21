import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  YARDI_COLUMNS,
  MRI_COLUMNS,
  APPFOLIO_COLUMNS,
  FREE_EXPORT_LIMIT,
} from "@/app/export/columns";

// b-08 — GET /api/export?abstract_id=<uuid>&format=yardi|mri|appfolio
//
// Tests:
//   1. Auth required (401 when no user)
//   2. Free-tier export count > FREE_EXPORT_LIMIT triggers the watermark
//      column; paid-tier ('pro') never adds the watermark regardless of count.
//   3. CSV column headers match the spec for each requested format.
//   4. Fires `abstract_exported` with { format, abstract_id, plan_at_export }.

// ─── Hoisted mocks ──────────────────────────────────────────────────────────
const {
  trackServerEventMock,
  getUserMock,
  createServerSupabaseClientMock,
  createServiceRoleClientMock,
  abstractsSelectMock,
  usersSelectMock,
  fieldsSelectMock,
  exportsSelectMock,
  exportsInsertMock,
} = vi.hoisted(() => ({
  trackServerEventMock: vi.fn(),
  getUserMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
  abstractsSelectMock: vi.fn(),
  usersSelectMock: vi.fn(),
  fieldsSelectMock: vi.fn(),
  exportsSelectMock: vi.fn(),
  exportsInsertMock: vi.fn(),
}));

vi.mock("@/lib/analytics-server", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────
// RFC4122 v4-format UUID — required by z.uuid() in the export route schema.
const VALID_UUID = "11111111-1111-4111-8111-111111111111";

interface SetupOpts {
  authedUserId?: string | null;
  abstractStatus?: "processing" | "ready" | "approved";
  abstractOwnerId?: string;
  plan?: "free" | "pro";
  priorExportCount?: number;
  fields?: Array<{ field_name: string; value: string | null }>;
}

function setupMocks(opts: SetupOpts = {}) {
  const {
    authedUserId = "user-A",
    abstractStatus = "approved",
    abstractOwnerId = "user-A",
    plan = "free",
    priorExportCount = 0,
    fields = [
      { field_name: "tenant_name", value: "Acme LLC" },
      { field_name: "base_rent", value: "5000" },
    ],
  } = opts;

  getUserMock.mockResolvedValue({
    data: { user: authedUserId ? { id: authedUserId } : null },
    error: null,
  });

  abstractsSelectMock.mockReturnValue({
    eq: () => ({
      maybeSingle: () =>
        Promise.resolve({
          data: {
            id: VALID_UUID,
            status: abstractStatus,
            user_id: abstractOwnerId,
          },
          error: null,
        }),
    }),
  });

  usersSelectMock.mockReturnValue({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: { plan }, error: null }),
    }),
  });

  fieldsSelectMock.mockReturnValue({
    eq: () => Promise.resolve({ data: fields, error: null }),
  });

  // The exports ledger SELECT (count of prior exports for the abstract).
  exportsSelectMock.mockReturnValue({
    eq: () =>
      Promise.resolve({
        data: Array.from({ length: priorExportCount }, (_, i) => ({ id: `exp-${i}` })),
        error: null,
      }),
  });

  exportsInsertMock.mockResolvedValue({ error: null });

  createServerSupabaseClientMock.mockResolvedValue({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "abstracts") return { select: abstractsSelectMock };
      if (table === "users") return { select: usersSelectMock };
      if (table === "abstract_fields") return { select: fieldsSelectMock };
      if (table === "exports") return { select: exportsSelectMock };
      throw new Error(`unexpected server-client table: ${table}`);
    },
  });

  createServiceRoleClientMock.mockReturnValue({
    from: (table: string) => {
      if (table === "exports") return { insert: exportsInsertMock };
      throw new Error(`unexpected service-client table: ${table}`);
    },
  });
}

function exportRequest(opts: { format?: string; abstractId?: string } = {}) {
  const { format = "yardi", abstractId = VALID_UUID } = opts;
  return new Request(
    `http://localhost/api/export?abstract_id=${abstractId}&format=${format}`,
    { method: "GET" },
  );
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
  createServiceRoleClientMock.mockReset();
  abstractsSelectMock.mockReset();
  usersSelectMock.mockReset();
  fieldsSelectMock.mockReset();
  exportsSelectMock.mockReset();
  exportsInsertMock.mockReset();
});

describe("GET /api/export — auth", () => {
  it("returns 401 when there is no Supabase user", async () => {
    setupMocks({ authedUserId: null });
    const { GET } = await loadRoute();
    const res = await GET(exportRequest());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/export — CSV column headers per format", () => {
  it("yardi: header row matches YARDI_COLUMNS", async () => {
    setupMocks();
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "yardi" }));
    expect(res.status).toBe(200);
    const csv = await res.text();
    const headerRow = csv.split("\n")[0];
    for (const col of YARDI_COLUMNS) {
      expect(headerRow).toContain(col);
    }
  });

  it("mri: header row matches MRI_COLUMNS", async () => {
    setupMocks();
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "mri" }));
    expect(res.status).toBe(200);
    const csv = await res.text();
    const headerRow = csv.split("\n")[0];
    for (const col of MRI_COLUMNS) {
      expect(headerRow).toContain(col);
    }
  });

  it("appfolio: header row matches APPFOLIO_COLUMNS", async () => {
    setupMocks();
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "appfolio" }));
    expect(res.status).toBe(200);
    const csv = await res.text();
    const headerRow = csv.split("\n")[0];
    for (const col of APPFOLIO_COLUMNS) {
      expect(headerRow).toContain(col);
    }
  });
});

describe("GET /api/export — free-tier limit", () => {
  it("free tier under the limit: no watermark column appended", async () => {
    setupMocks({ plan: "free", priorExportCount: FREE_EXPORT_LIMIT - 1 });
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "yardi" }));
    const csv = await res.text();
    expect(csv).not.toContain("_WATERMARK");
  });

  it("free tier at or beyond the limit: watermark column appended", async () => {
    setupMocks({ plan: "free", priorExportCount: FREE_EXPORT_LIMIT });
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "yardi" }));
    const csv = await res.text();
    expect(csv).toContain("_WATERMARK");
  });

  it("paid tier ('pro') is unlimited — no watermark even past the limit", async () => {
    setupMocks({ plan: "pro", priorExportCount: FREE_EXPORT_LIMIT * 10 });
    const { GET } = await loadRoute();
    const res = await GET(exportRequest({ format: "yardi" }));
    const csv = await res.text();
    expect(csv).not.toContain("_WATERMARK");
  });
});

describe("GET /api/export — analytics", () => {
  it("fires `abstract_exported` with { format, abstract_id, plan_at_export }", async () => {
    setupMocks({ plan: "free" });
    const { GET } = await loadRoute();
    await GET(exportRequest({ format: "mri" }));
    const exportedCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "abstract_exported",
    );
    expect(exportedCalls).toHaveLength(1);
    const props = exportedCalls[0][2] as {
      format: string;
      abstract_id: string;
      plan_at_export: string;
    };
    expect(props.format).toBe("mri");
    expect(props.abstract_id).toBe(VALID_UUID);
    expect(props.plan_at_export).toBe("free");
  });

  it("plan_at_export reflects the user's current plan ('pro' for paid)", async () => {
    setupMocks({ plan: "pro" });
    const { GET } = await loadRoute();
    await GET(exportRequest({ format: "appfolio" }));
    const exportedCalls = trackServerEventMock.mock.calls.filter(
      (c) => c[0] === "abstract_exported",
    );
    expect(exportedCalls).toHaveLength(1);
    const props = exportedCalls[0][2] as { plan_at_export: string };
    expect(props.plan_at_export).toBe("pro");
  });
});
