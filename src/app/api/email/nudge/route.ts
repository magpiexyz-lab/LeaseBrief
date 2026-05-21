import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendActivationNudge } from "@/lib/email";

// GET /api/email/nudge — cron-triggered (Vercel Cron, daily 9am UTC).
//
// Identifies users who signed up >= 24h ago, haven't yet completed their
// first abstract_completed (activated_at IS NULL), and haven't already
// received a nudge (nudge_sent_at IS NULL). Sends an activation nudge.
//
// Auth: bearer token in the `Authorization` header matches CRON_SECRET.
// Vercel automatically sends this; never expose CRON_SECRET to the client.

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Service not configured" },
      { status: 503 },
    );
  }
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, created_at, activated_at, nudge_sent_at")
    .lt("created_at", twentyFourHoursAgo)
    .is("activated_at", null)
    .is("nudge_sent_at", null);

  if (error) {
    console.error("nudge query failed:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    id: string;
    email: string | null;
  }>;

  let sent = 0;
  for (const u of rows) {
    if (!u.email) continue;
    try {
      await sendActivationNudge(
        u.email,
        "there",
        "abstract your first commercial lease",
        "/dashboard",
      );
      await supabase
        .from("users")
        .update({ nudge_sent_at: new Date().toISOString() })
        .eq("id", u.id);
      sent += 1;
    } catch (e) {
      console.error(
        "nudge email failed for user",
        u.id,
        ":",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return NextResponse.json({ ok: true, sent });
}
