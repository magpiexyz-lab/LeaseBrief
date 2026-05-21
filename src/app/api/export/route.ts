import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { trackServerEvent } from "@/lib/analytics-server";
import {
  FORMAT_SPECS,
  FREE_EXPORT_LIMIT,
  type ExportFormat,
} from "@/app/export/columns";

// GET /api/export?abstract_id=<uuid>&format=yardi|mri|appfolio — b-08.
//
// Returns a CSV body whose column headers match the target system's import
// spec (Yardi Voyager, MRI Software, AppFolio Commercial). Auth-gated:
// only the owner of the abstract may export it.
//
// Free tier limit: 3 exports per abstract. After that, free-tier responses
// return a watermarked CSV (header row carries a trailing `_WATERMARK`
// column) so the funnel isn't hard-blocked — paid users see no watermark.
// The fired analytics event (`abstract_exported`) carries plan_at_export so
// /iterate can dimension by plan.

export const exportQuerySchema = z.object({
  abstract_id: z.uuid(),
  format: z.enum(["yardi", "mri", "appfolio"]),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  // ── parse + validate query params. ─────────────────────────────────────
  const url = new URL(request.url);
  const queryParams = {
    abstract_id: url.searchParams.get("abstract_id") ?? "",
    format: url.searchParams.get("format") ?? "",
  };
  let parsed: ExportQuery;
  try {
    parsed = exportQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { abstract_id, format } = parsed;
  const spec = FORMAT_SPECS[format as ExportFormat];

  // ── auth — only the owner may export. RLS gates the SELECT below. ──────
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── load abstract + plan ───────────────────────────────────────────────
  const { data: abstractRow, error: abstractErr } = await supabase
    .from("abstracts")
    .select("id, status, user_id")
    .eq("id", abstract_id)
    .maybeSingle();
  if (abstractErr) {
    console.error("export abstract lookup error:", abstractErr.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!abstractRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const row = abstractRow as {
    id: string;
    status: "processing" | "ready" | "approved";
    user_id: string;
  };
  // State-transition guard: only `approved` abstracts may be exported.
  // (Mutation routes use 409; export is a read so 409 is the closest
  // semantic match — the request asked for something the entity state
  // doesn't permit yet.)
  if (row.status !== "approved") {
    return NextResponse.json(
      { error: "Abstract is not approved" },
      { status: 409 },
    );
  }

  // ── plan check ─────────────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan: "free" | "pro" =
    (userRow as { plan?: string } | null)?.plan === "pro" ? "pro" : "free";

  // ── load the 30 abstract_fields for the CSV body ───────────────────────
  const { data: fields, error: fieldsErr } = await supabase
    .from("abstract_fields")
    .select("field_name, value")
    .eq("abstract_id", abstract_id);
  if (fieldsErr) {
    console.error("export fields lookup error:", fieldsErr.message);
    return NextResponse.json(
      { error: "Could not load abstract fields" },
      { status: 500 },
    );
  }
  const fieldMap = new Map<string, string>();
  for (const f of (fields ?? []) as Array<{
    field_name: string;
    value: string | null;
  }>) {
    fieldMap.set(f.field_name, f.value ?? "");
  }

  // ── free-tier export-count check ───────────────────────────────────────
  // The `exports` ledger table is optional (created by /change post-MVP).
  // Gracefully tolerate its absence — treat the count as 0 and skip the
  // watermark check so the bootstrap flow doesn't depend on a follow-on
  // migration.
  let existingCount = 0;
  try {
    const { data: priorExports } = await supabase
      .from("exports")
      .select("id")
      .eq("abstract_id", abstract_id);
    if (Array.isArray(priorExports)) existingCount = priorExports.length;
  } catch {
    existingCount = 0;
  }
  const willWatermark = plan === "free" && existingCount >= FREE_EXPORT_LIMIT;

  // ── build the CSV. Column ORDER matters — importers are positional. ────
  const columns = [...spec.columns];
  if (willWatermark) columns.push("_WATERMARK_LEASEBRIEF_FREE_TIER");

  const header = columns.map(csvEscape).join(",");
  const dataRow = columns
    .map((col) => {
      // The target-system column name → LeaseBrief field_name mapping is a
      // best-effort lower-snake_case match (header words joined with `_`).
      // Unmapped columns emit empty cells — the importer fills defaults.
      if (col.startsWith("_WATERMARK")) {
        return csvEscape("LeaseBrief Free Tier — Upgrade for clean exports");
      }
      const slug = col
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      // Try direct lookup then a few common synonyms.
      const direct = fieldMap.get(slug);
      if (direct !== undefined) return csvEscape(direct);
      const synonyms: Record<string, string> = {
        property_id: "property_code",
        unit_id: "unit_code",
        tenant_id: "tenant_name",
        property: "property_code",
        unit: "unit_code",
        tenant: "tenant_name",
        tenant_legal_name: "tenant_name",
        lease_num: "lease_type",
        lease_number: "lease_type",
        lease_category: "lease_type",
        start_date: "lease_start",
        end_date: "lease_end",
        occupancy_date: "move_in_date",
        termination_date: "move_out_date",
        monthly_rent: "base_rent",
        rate_per_sqft: "rent_psf",
        rentable_sf: "square_footage",
        area_sf: "square_footage",
        deposit_amt: "security_deposit",
        rent_escalation: "escalation_type",
        annual_escalation: "escalation_rate",
        escalation_method: "escalation_type",
        escalation_pct: "escalation_rate",
        renewal_options: "renewal_option",
        option_type: "renewal_option",
        option_notice_days: "option_notice_period",
        notice_period_days: "option_notice_period",
        recovery_method: "cam_type",
        recovery_type: "cam_type",
        base_year: "cam_base_year",
        opex_stop: "operating_expense_stop",
        expense_stop: "operating_expense_stop",
        re_tax_stop: "real_estate_tax_stop",
        tax_stop: "real_estate_tax_stop",
        utility_resp: "utilities_responsibility",
        utilities_paid_by: "utilities_responsibility",
        parking_count: "parking_spaces",
        parking_allocation: "parking_spaces",
        parking_rent: "parking_rate",
        permitted_use: "use_clause",
        exclusive_rights: "exclusive_use",
        lease_notes: "notes",
        lease_memo: "notes",
      };
      const mapped = synonyms[slug];
      if (mapped) {
        const v = fieldMap.get(mapped);
        if (v !== undefined) return csvEscape(v);
      }
      return csvEscape("");
    })
    .join(",");

  const csv = `${header}\n${dataRow}\n`;

  // ── record the export in the ledger (best-effort, service-role write
  //    since exports has no client INSERT policy by design). ──────────────
  try {
    const service = createServiceRoleClient();
    await service
      .from("exports")
      .insert({ abstract_id, user_id: user.id, format, plan });
  } catch (e) {
    // exports ledger does not exist yet, or service-role key missing — no-op.
    console.error(
      "exports ledger insert failed (non-fatal):",
      e instanceof Error ? e.message : String(e),
    );
  }

  // ── Fire server-side `abstract_exported` (b-08 + EVENTS.yaml). The schema
  //    requires { abstract_id, format, plan_at_export }. ───────────────────
  await trackServerEvent("abstract_exported", user.id, {
    abstract_id,
    format,
    plan_at_export: plan,
  });

  const fileName = `${row.id.slice(0, 8)}.${spec.fileSuffix}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
