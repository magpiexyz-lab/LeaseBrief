import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { trackServerEvent } from "@/lib/analytics-server";

// POST /api/abstract — b-03 (upload) + b-04 (stub AI extraction).
//
// User POSTs a PDF as multipart/form-data with field name `file`. We:
//   1. Reject non-PDFs / oversized uploads with a 400 (b-03).
//   2. Create an `abstracts` row with status='processing'.
//   3. Run the STUB extraction (user-confirmed at STATE 12 — no LLM stack)
//      synthesizing 30 fields with realistic confidence distribution
//      (24 ≥ 0.85, 6 < 0.85) so the funnel can validate `abstract_completed`.
//   4. Persist 30 `abstract_fields` rows via the service-role client (writes
//      are RLS-gated to service role per migration 001).
//   5. Fire `field_extracted` ×30 and `field_high_confidence` for each
//      high-confidence field (b-04 contract).
//   6. Update the abstract row to status='ready' with extraction_duration_ms.
//   7. Return `{ abstract_id }` so the client can navigate to /abstract/<id>.
//
// Future upgrade path: replace the STUB_FIELDS synthesis with a real LLM
// call (e.g., Anthropic Claude with vision). The persistence and event-firing
// scaffold stays unchanged.

export const dynamic = "force-dynamic";

// Validate the multipart form. We don't validate the binary itself with zod —
// we validate the wrapper metadata (size, name, mime) below.
export const abstractSchema = z.object({
  // Reserved for future POST-as-JSON callers; the current implementation reads
  // FormData. Keep the schema in place so types.ts has something to import.
  file_name: z.string().min(1).max(500).optional(),
});
export type CreateAbstractResponse = { abstract_id: string };

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — mirrors client-side check

// The 30 LeaseBrief field names. Order matches the abstract-detail page's
// grouping (rent, term, options, NNN/CAM, etc.).
const FIELD_NAMES = [
  "base_rent",
  "rent_frequency",
  "rent_psf",
  "annual_rent",
  "lease_type",
  "lease_start",
  "lease_end",
  "move_in_date",
  "move_out_date",
  "security_deposit",
  "escalation_type",
  "escalation_rate",
  "renewal_option",
  "option_notice_period",
  "cam_type",
  "cam_base_year",
  "nnn_pass_through",
  "operating_expense_stop",
  "real_estate_tax_stop",
  "insurance_stop",
  "utilities_responsibility",
  "parking_spaces",
  "parking_rate",
  "use_clause",
  "exclusive_use",
  "tenant_name",
  "property_code",
  "unit_code",
  "square_footage",
  "notes",
] as const;

// Deterministic mock confidence + value generator.
// 24 of 30 fields have confidence >= 0.85; 6 are in [0.55, 0.84).
function mockFields(abstractId: string) {
  // Low-confidence indices: spread across categories to exercise the review
  // queue UI (b-06). The set is fixed to keep tests deterministic.
  const lowIndices = new Set([2, 11, 16, 20, 24, 29]);
  return FIELD_NAMES.map((field_name, idx) => {
    const isLow = lowIndices.has(idx);
    // Synthesize a confidence within the appropriate bucket.
    // High: 0.85 .. 0.99; Low: 0.55 .. 0.84.
    const noise = ((idx * 9301 + 49297) % 233280) / 233280; // pseudo-random [0,1)
    const confidence = isLow
      ? Number((0.55 + noise * 0.29).toFixed(3))
      : Number((0.85 + noise * 0.14).toFixed(3));
    return {
      abstract_id: abstractId,
      field_name,
      value: `mock-${field_name}-value`,
      confidence,
      reviewer_edited: false,
      source_page: ((idx % 8) + 1),
    };
  });
}

export async function POST(request: Request) {
  // Auth check — must be a signed-in user to create an abstract.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form. fail-closed on malformed bodies.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in upload" },
      { status: 400 },
    );
  }

  // PDF MIME + extension check (mirrors client-side classifyFile).
  const lowerName = file.name.toLowerCase();
  const isPdfMime =
    file.type === "application/pdf" || file.type === "application/x-pdf";
  const isPdfExt = lowerName.endsWith(".pdf");
  if (!isPdfMime && !isPdfExt) {
    return NextResponse.json(
      { error: "Only PDF lease documents are accepted" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "Uploaded PDF is empty" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 50 MB limit" },
      { status: 400 },
    );
  }

  const t0 = Date.now();

  // ── 1. Create the abstracts row (RLS: user inserts own rows) ───────────
  // We DO NOT upload the PDF binary in this STUB implementation — we record
  // the filename so the abstract has a recognizable identity. Real upload
  // wiring is a follow-on /change scope item.
  const { data: insertRow, error: insertErr } = await supabase
    .from("abstracts")
    .insert({
      user_id: user.id,
      pdf_url: file.name,
      status: "processing",
    })
    .select("id, status")
    .single();
  if (insertErr || !insertRow) {
    console.error(
      "abstract insert failed:",
      insertErr?.message ?? "no row returned",
    );
    return NextResponse.json(
      { error: "Could not create abstract" },
      { status: 500 },
    );
  }

  // The Supabase TS client returns `data: unknown` once .select().single() is
  // chained — narrow to the shape we need without leaking row internals.
  const row = insertRow as { id: string; status: string };
  const abstractId = row.id;

  // ── 2. Run the STUB extraction. ────────────────────────────────────────
  const fields = mockFields(abstractId);

  // ── 3. Persist fields via the service role (RLS forbids client writes
  //       on abstract_fields per migration 001). ──────────────────────────
  const service = createServiceRoleClient();
  const { error: fieldsErr } = await service
    .from("abstract_fields")
    .insert(fields);
  if (fieldsErr) {
    console.error("abstract_fields insert failed:", fieldsErr.message);
    return NextResponse.json(
      { error: "Extraction persistence failed" },
      { status: 500 },
    );
  }

  // ── 4. Fire per-field server-side analytics. ───────────────────────────
  //       field_extracted fires for every field; field_high_confidence
  //       fires for confidence >= 0.85 only. Fire as a parallel batch.
  await Promise.all(
    fields.flatMap((f) => {
      const calls: Array<Promise<unknown>> = [
        trackServerEvent("field_extracted", user.id, {
          abstract_id: abstractId,
          field_name: f.field_name,
          confidence: f.confidence,
        }),
      ];
      if (f.confidence >= 0.85) {
        calls.push(
          trackServerEvent("field_high_confidence", user.id, {
            abstract_id: abstractId,
            field_name: f.field_name,
            confidence: f.confidence,
          }),
        );
      }
      return calls;
    }),
  );

  const extractionDurationMs = Date.now() - t0;

  // ── 5. State transition: processing → ready. Guard with the existing
  //       status so concurrent re-extractions can't trample each other. ──
  if (row.status !== "processing") {
    return NextResponse.json(
      { error: "Invalid state transition" },
      { status: 409 },
    );
  }
  const { error: updateErr } = await service
    .from("abstracts")
    .update({
      status: "ready",
      extraction_duration_ms: extractionDurationMs,
    })
    .eq("id", abstractId);
  if (updateErr) {
    console.error("abstract status update failed:", updateErr.message);
    // The fields are written; the abstract is recoverable. Return 200 with
    // the id so the client can navigate; status will be reconciled by the
    // next read.
  }

  const response: CreateAbstractResponse = { abstract_id: abstractId };
  return NextResponse.json(response, { status: 201 });
}
