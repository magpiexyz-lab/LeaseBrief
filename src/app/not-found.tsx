import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.18em] text-[var(--whisper)]">
        404
      </p>
      <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-[var(--ink)] md:text-6xl">
        That page is off the lease.
      </h1>
      <p className="mt-4 max-w-md text-base text-[var(--whisper)]">
        The page you&apos;re looking for isn&apos;t in this dossier. Head back
        and try again.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: "default" }) + " mt-8"}
      >
        Back to LeaseBrief
      </Link>
    </main>
  );
}
