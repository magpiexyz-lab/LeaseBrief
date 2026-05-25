"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  trackSignupStart,
  trackSignupComplete,
} from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./auth-shell";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fire signup_start once on page mount.
  useEffect(() => {
    trackSignupStart({ auth_method: "email" });
  }, []);

  async function handleSignup(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.user?.identities?.length === 0) {
      setError(
        "An account with this email already exists. Try logging in instead.",
      );
      return;
    }
    if (!data.session) {
      setSuccess(
        "Check your email for a confirmation link. Once confirmed, we will walk you straight into your first abstract.",
      );
      return;
    }
    trackSignupComplete({ auth_method: "email" });
    router.push("/dashboard");
  }

  return (
    <AuthShell
      eyebrow="§ NEW ACCOUNT"
      headline={
        <>
          Start abstracting in
          <br />
          <span className="text-[var(--brass)] italic">ninety seconds</span>.
        </>
      }
      lede="A single sign-in opens the drag-and-drop console — retire your outsourced abstract bill and run 30-field lease abstracts yourself."
      proofPoints={[
        "Thirty structured fields per lease, per-field confidence scored.",
        "Yardi, MRI Software, and AppFolio Commercial — one-click export.",
        "Your tenant terms never leave your tenancy.",
      ]}
      footer={
        success ? null : (
          <p className="text-sm text-[var(--whisper)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--ink)] underline decoration-[var(--brass)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--brass)]"
            >
              Log in
            </Link>
          </p>
        )
      }
    >
      {success ? (
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
                Confirmation sent.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--whisper)]">
                {success}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--whisper)]">
            Already confirmed?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--ink)] underline decoration-[var(--brass)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--brass)]"
            >
              Log in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <form onSubmit={handleSignup} className="space-y-5" noValidate>
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

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label
                  htmlFor="password"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--whisper)]"
                >
                  Password
                </Label>
                <PasswordStrength password={password} />
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Eight characters, minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
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
              <p className="text-xs leading-relaxed text-[var(--whisper)]">
                Minimum eight characters. Email confirmation required.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-[10px] border border-[var(--destructive)]/30 bg-[var(--destructive)]/8 px-4 py-3 text-sm text-[var(--destructive)]"
              >
                <span aria-hidden className="font-display italic">
                  ¶
                </span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="group/cta relative h-12 w-full overflow-hidden rounded-[9999px] bg-[var(--brass)] px-6 !text-base font-medium text-[var(--ink)] shadow-[0_1px_2px_rgba(200,152,85,0.18),0_4px_12px_rgba(200,152,85,0.20),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-[0_2px_4px_rgba(200,152,85,0.24),0_8px_20px_rgba(200,152,85,0.28),inset_0_1px_0_rgba(255,255,255,0.30)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Creating your account…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account
                  <span
                    aria-hidden
                    className="transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              )}
            </Button>

            <p className="text-xs leading-relaxed text-[var(--whisper)]">
              By creating an account you agree to our terms and privacy notice.
              Confidential lease terms are never shared with a third-party
              reviewer.
            </p>
          </form>
        </>
      )}
    </AuthShell>
  );
}

/* --------------------------------- helpers -------------------------------- */

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

function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const labels = ["", "Short", "Adequate", "Strong"];
  if (password.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex gap-1"
        aria-hidden
        role="presentation"
      >
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`block h-1 w-6 rounded-full transition-colors duration-150 ${
              i <= score
                ? score === 1
                  ? "bg-[var(--review-amber)]"
                  : score === 2
                    ? "bg-[var(--brass)]"
                    : "bg-[var(--confidence-high)]"
                : "bg-[var(--ash)]"
            }`}
          />
        ))}
      </div>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--whisper)]"
        aria-live="polite"
      >
        {labels[score]}
      </span>
    </div>
  );
}

function scorePassword(pw: string): number {
  if (pw.length < 8) return 1;
  let s = 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(3, s);
}
