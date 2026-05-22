"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackProWaitlistJoined } from "@/lib/events";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({
  source,
  abstractCount,
  defaultEmail,
  ctaLabel = "Join the waitlist",
}: {
  source: "pricing" | "dashboard";
  abstractCount?: number;
  defaultEmail?: string;
  ctaLabel?: string;
}) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid work email.");
      return;
    }
    trackProWaitlistJoined({
      email: trimmed,
      source,
      ...(typeof abstractCount === "number"
        ? { abstract_count_at_upgrade: abstractCount }
        : {}),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-[12px] border border-[var(--brass)]/40 bg-[var(--brass)]/[0.08] px-5 py-4 text-sm leading-relaxed text-[var(--ink)]"
      >
        <span className="font-display text-base italic text-[var(--brass)]">
          ¶
        </span>{" "}
        You&apos;re on the list. We&apos;ll email{" "}
        <span className="font-mono">{email}</span> the moment Pro checkout opens.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch"
      noValidate
    >
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@brokerage.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-label="Work email"
        className="h-12 flex-1 rounded-[10px] border-[var(--ash)] bg-[var(--vellum)] px-4 !text-base text-[var(--ink)] placeholder:text-[var(--whisper)]/70 focus-visible:border-[var(--brass)] focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40 md:!text-base"
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 rounded-pill bg-[var(--brass)] px-6 font-body text-base font-medium text-[var(--ink)] shadow-[0_0_0_1px_rgba(26,34,56,0.06),0_4px_8px_rgba(200,152,85,0.18)] transition-all duration-180 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(26,34,56,0.08),0_8px_24px_rgba(200,152,85,0.32)]"
      >
        {ctaLabel}
      </Button>
      {error && (
        <p
          role="alert"
          className="basis-full font-body text-sm text-destructive sm:order-3"
        >
          {error}
        </p>
      )}
    </form>
  );
}
