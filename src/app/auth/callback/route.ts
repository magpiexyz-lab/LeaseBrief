import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { trackServerEvent } from "@/lib/analytics-server";

// /auth/callback — Supabase PKCE callback handler.
//
// Required for: email-confirmation signup, OAuth/Google login, password reset,
// and magic links. Exchanges the `code` query param for an active session,
// then redirects the user to either the `?next=` destination (allowlisted to
// absolute paths beginning with `/`) or `/dashboard` by default.
//
// When `stack.analytics` is present (it is — posthog), we ALSO fire the
// canonical `signup_complete` event from this chokepoint. The recency filter
// (user.created_at < SIGNUP_RECENCY_MS) avoids double-firing on returning
// magic-link / password-reset users — see auth/supabase.md "When
// stack.analytics is present, fire signup_complete from the callback route".

const codeSchema = z.string().min(20).max(512).regex(/^[A-Za-z0-9_-]+$/);
const SIGNUP_RECENCY_MS = 60_000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  if (process.env.DEMO_MODE === "true" && process.env.VERCEL === "1") {
    throw new Error("DEMO_MODE is not allowed in production");
  }
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.redirect(`${origin}/`);
  }

  // Handle explicit OAuth errors first (e.g., oauth_email_missing).
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const safeErr = encodeURIComponent(oauthError.slice(0, 100));
    return NextResponse.redirect(`${origin}/login?error=${safeErr}`);
  }

  const rawCode = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Allowlist next-targets to local-path-only (defends against open-redirect
  // via `next=//evil.com` which the browser parses as a protocol-relative
  // URL).
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const parsedCode = rawCode ? codeSchema.safeParse(rawCode) : null;
  if (parsedCode?.success) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(
      parsedCode.data,
    );
    if (!error) {
      // Fire signup_complete for new users only — recency filter.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (
          user &&
          Date.now() - new Date(user.created_at).getTime() < SIGNUP_RECENCY_MS
        ) {
          const provider =
            (user.app_metadata?.provider as string | undefined) ?? "email";
          await trackServerEvent("signup_complete", user.id, {
            auth_method: provider,
          });
        }
      } catch (e) {
        // Analytics failure must NOT block redirect.
        console.error(
          "callback signup_complete failed:",
          e instanceof Error ? e.message : String(e),
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
