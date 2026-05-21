import { createClient } from "@supabase/supabase-js";
import { readFileSync, unlinkSync } from "fs";
import path from "path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const AUTH_FILE = path.join(__dirname, ".auth.json");

export default async function globalTeardown() {
  try {
    const { userId } = JSON.parse(readFileSync(AUTH_FILE, "utf-8"));
    if (!userId) return;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await supabase.auth.admin.deleteUser(userId);
    unlinkSync(AUTH_FILE);
  } catch {
    // Cleanup is best-effort — swallow all errors so teardown never fails
    // the test run.
  }
}
