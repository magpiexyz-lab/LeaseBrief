"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// /auth/reset-password — lets the user set a new password after clicking
// the reset link from their email. The /auth/callback route exchanges the
// PKCE code first, so by the time this page mounts a session is active and
// updateUser() can change the password directly.

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReset(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="bg-brass-halo relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <header className="mb-10 space-y-3">
          <p className="eyebrow">
            <span className="font-mono text-[var(--brass)]">§</span> Reset
          </p>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            Set a new password
          </h1>
          <p className="text-base text-[var(--whisper)]">
            Pick something at least 8 characters. You&apos;ll be signed in once
            you save.
          </p>
        </header>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {/* Always-mounted live region — toggled via sr-only.
              See framework/nextjs.md → "When a form or status message uses a
              conditionally-mounted role=alert element". */}
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className={
              error
                ? "rounded-[var(--radius-input)] bg-[var(--destructive)]/8 px-3 py-2 text-sm text-[var(--destructive)]"
                : "sr-only"
            }
          >
            {error ?? ""}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full"
          >
            {loading ? "Updating..." : "Set new password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
