"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LeaseBrief] Page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.18em] text-[var(--whisper)]">
        Something interrupted the abstract.
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[var(--ink)] md:text-5xl">
        We hit an unexpected error.
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--whisper)]">
        Our team has been notified. Try the action again in a moment.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-[var(--whisper)]">
          Ref: {error.digest}
        </p>
      ) : null}
      <Button onClick={() => reset()} className="mt-8">
        Try again
      </Button>
    </main>
  );
}
