"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { trackSignupStart } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "../signup/auth-shell";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google">(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
  const queryError = searchParams.get("error");
  const next = searchParams.get("next") ?? "/dashboard";

  async function handleLogin(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    router.push(safeNext);
  }

  async function handleForgotPassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      },
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setForgotSent(true);
  }

  async function handleGoogleLogin() {
    setOauthLoading("google");
    setError("");
    // The activate-stage event is the same whether the OAuth round-trip
    // results in a new signup or a returning login — fire it before the redirect.
    trackSignupStart({ auth_method: "google" });
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next,
        )}`,
      },
    });
    if (oauthError) {
      setOauthLoading(null);
      setError(oauthError.message);
    }
  }

  return (
    <AuthShell
      eyebrow="§ RETURNING USER"
      headline={
        <>
          Welcome back to the
          <br />
          <span className="text-[var(--brass)] italic">abstract console</span>.
        </>
      }
      lede="Sign in to pick up where you left off — your in-flight extractions and approved abstracts are waiting on the dashboard."
      proofPoints={[
        "Your account, your tenancy, your tenant terms.",
        "Continue an abstract or start a new one in one click.",
        "Free tier preserved; upgrades carry over instantly.",
      ]}
      footer={
        <p className="text-sm text-[var(--whisper)]">
          New to LeaseBrief?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--ink)] underline decoration-[var(--brass)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--brass)]"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {/* Status banners */}
      {confirmed && (
        <Banner tone="positive">
          Email confirmed. Sign in below to enter the console.
        </Banner>
      )}
      {queryError === "oauth_email_missing" && (
        <Banner tone="alert" role="alert">
          <p className="font-medium text-[var(--ink)]">
            We need your email to create your account.
          </p>
          <p className="mt-1 text-sm text-[var(--ink)]/85">
            Two ways forward — use the email and password form below, or retry
            Google sign-in and allow access to your email address on the
            consent screen.
          </p>
        </Banner>
      )}
      {queryError === "auth" && (
        <Banner tone="alert" role="alert">
          Authentication failed. Please try again, or use the &ldquo;Forgot
          password&rdquo; link if you have lost access.
        </Banner>
      )}

      {forgotMode ? (
        forgotSent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-[14px] border border-[var(--ash)] bg-[var(--vellum)] p-5 shadow-[0_1px_2px_rgba(200,152,85,0.06),0_2px_4px_rgba(26,34,56,0.04)]">
              <div
                aria-hidden
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--brass)]/40 bg-[var(--brass)]/15 font-display text-base italic text-[var(--brass)]"
              >
                §
              </div>
              <div>
                <p className="font-display text-lg font-medium leading-snug text-[var(--ink)]">
                  Reset link sent.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--whisper)]">
                  Check {email || "your inbox"} for an email from LeaseBrief.
                  Follow the link to set a new password, then return here.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)] transition-colors hover:text-[var(--brass)]"
              onClick={() => {
                setForgotMode(false);
                setForgotSent(false);
                setError("");
              }}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
            <p className="text-sm leading-relaxed text-[var(--whisper)]">
              Enter the email on your account. We will send a one-time link to
              reset your password.
            </p>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--whisper)]"
              >
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@brokerage.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-[10px] border-[var(--ash)] bg-[var(--vellum)] px-4 !text-base text-[var(--ink)] shadow-[inset_0_1px_2px_rgba(26,34,56,0.03)] placeholder:text-[var(--whisper)]/70 focus-visible:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40 md:!text-base"
              />
            </div>
            {error && <InlineError>{error}</InlineError>}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-[9999px] bg-[var(--brass)] px-6 !text-base font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(200,152,85,0.18),0_4px_12px_rgba(200,152,85,0.20),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(200,152,85,0.24),0_8px_20px_rgba(200,152,85,0.28),inset_0_1px_0_rgba(255,255,255,0.30)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Sending…
                </span>
              ) : (
                "Send reset link"
              )}
            </Button>
            <button
              type="button"
              className="block font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--whisper)] transition-colors hover:text-[var(--brass)]"
              onClick={() => {
                setForgotMode(false);
                setError("");
              }}
            >
              ← Back to sign in
            </button>
          </form>
        )
      ) : (
        <>
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--whisper)]"
              >
                Work email
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@brokerage.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || oauthLoading !== null}
                className="h-12 rounded-[10px] border-[var(--ash)] bg-[var(--vellum)] px-4 !text-base text-[var(--ink)] shadow-[inset_0_1px_2px_rgba(26,34,56,0.03)] placeholder:text-[var(--whisper)]/70 focus-visible:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40 md:!text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label
                  htmlFor="password"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--whisper)]"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError("");
                  }}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--whisper)] transition-colors hover:text-[var(--brass)]"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || oauthLoading !== null}
                  className="h-12 rounded-[10px] border-[var(--ash)] bg-[var(--vellum)] px-4 pr-14 !text-base text-[var(--ink)] shadow-[inset_0_1px_2px_rgba(26,34,56,0.03)] placeholder:text-[var(--whisper)]/70 focus-visible:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40 md:!text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--whisper)] transition-colors hover:text-[var(--brass)]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <InlineError>{error}</InlineError>}

            <Button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="group/cta relative h-12 w-full overflow-hidden rounded-[9999px] bg-[var(--brass)] px-6 !text-base font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(200,152,85,0.18),0_4px_12px_rgba(200,152,85,0.20),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(200,152,85,0.24),0_8px_20px_rgba(200,152,85,0.28),inset_0_1px_0_rgba(255,255,255,0.30)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign in
                  <span
                    aria-hidden
                    className="transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              )}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--parchment)]">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

/* --------------------------------- helpers -------------------------------- */

function GoogleGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.94h5.51c-.24 1.42-1.7 4.16-5.51 4.16-3.31 0-6.01-2.74-6.01-6.12s2.7-6.12 6.01-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.46 14.66 2.5 12 2.5 6.75 2.5 2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c5.49 0 9.13-3.86 9.13-9.29 0-.62-.07-1.1-.16-1.51H12z"
      />
      <path
        fill="#34A853"
        d="M21.13 12.21c0-.62-.07-1.1-.16-1.51H12v3.94h5.51c-.24 1.42-1.7 4.16-5.51 4.16-2.18 0-4.04-1.15-5.02-2.81l-3.13 2.42C5.69 20.39 8.62 22 12 22c5.49 0 9.13-3.86 9.13-9.79z"
      />
      <path
        fill="#FBBC05"
        d="M6.99 14c-.25-.74-.39-1.52-.39-2.32s.14-1.58.39-2.32V6.84H3.86C3.18 8.36 2.8 10.13 2.8 12s.38 3.64 1.06 5.16l3.13-2.42z"
      />
      <path
        fill="#4285F4"
        d="M12 6.7c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.46 14.66 2.5 12 2.5c-3.38 0-6.31 1.61-8.14 4.16L6.99 9.17C7.96 7.51 9.82 6.36 12 6.36V6.7z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-[10px] border border-[var(--destructive)]/30 bg-[var(--destructive)]/8 px-4 py-3 text-sm text-[var(--destructive)]"
    >
      <span aria-hidden className="font-display italic">
        ¶
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function Banner({
  tone,
  children,
  role,
}: {
  tone: "positive" | "alert";
  children: React.ReactNode;
  role?: string;
}) {
  const isAlert = tone === "alert";
  return (
    <div
      role={role}
      className={`mb-6 rounded-[10px] border px-4 py-3 text-sm leading-relaxed ${
        isAlert
          ? "border-[var(--review-amber)]/40 bg-[var(--review-amber)]/10 text-[var(--ink)]"
          : "border-[var(--confidence-high)]/35 bg-[var(--confidence-high)]/10 text-[var(--ink)]"
      }`}
    >
      {children}
    </div>
  );
}
