import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { trackServerEvent } from "@/lib/analytics-server";

// POST /api/abstract/[id]/approve — b-05.
//
// Moves an abstract from status='ready' → status='approved' and stamps
// approved_at. Auth-gated to the abstract owner. RLS prevents users from
// touching status (server-role only) so we use the service-role client for
// the UPDATE after verifying ownership through the user-scoped client.

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("abstracts")
    .select("id, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const abstract = row as {
    id: string;
    status: "processing" | "ready" | "approved";
    user_id: string;
  };

  if (abstract.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (abstract.status === "approved") {
    return NextResponse.json({ ok: true, already_approved: true });
  }
  if (abstract.status !== "ready") {
    return NextResponse.json(
      { error: "Abstract is not ready to approve" },
      { status: 409 },
    );
  }

  const service = createServiceRoleClient();
  const { error: updateErr } = await service
    .from("abstracts")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    console.error("approve update failed:", updateErr.message);
    return NextResponse.json(
      { error: "Could not approve abstract" },
      { status: 500 },
    );
  }

  await trackServerEvent("abstract_completed", user.id, {
    abstract_id: id,
  });

  return NextResponse.json({ ok: true });
}
