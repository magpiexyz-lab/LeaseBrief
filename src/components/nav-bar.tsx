"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

// Suppress the global NavBar on landing/marketing/auth routes — those pages
// ship their own in-page nav, and a doubled top bar produces collision +
// hydration noise. See framework/nextjs.md → "Suppress the global NavBar".
const AUTH_ROUTES = ["/login", "/signup", "/auth/"];
const MARKETING_ROUTE_PREFIXES = ["/v/"];

// LeaseBrief NavBar — auth-aware top navigation, mounted from the root layout.
export function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isAuth = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r),
  );
  const isMarketing =
    pathname === "/" ||
    MARKETING_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAuth || isMarketing) return null;

  // Nav links derived from `derive_scope_pages(experiment)` ordered with
  // golden_path pages first (funnel sequence), then behavior-only pages
  // appended alphabetically. Excludes landing, login, signup, auth/* routes.
  // The `/abstract/<id>` route is dynamic-only — we link to /dashboard which
  // hosts the user's abstract list, the canonical entry point for that page.
  const navLinks = (
    <>
      {/* DERIVED-FROM: derive_scope_pages */}
      <Link
        href="/dashboard"
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/abstract-new"
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        New abstract
      </Link>
      <Link
        href="/review-queue"
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        Review queue
      </Link>
      <Link
        href="/export"
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        Export
      </Link>
      <Link
        href="/pricing"
        className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        Pricing
      </Link>
    </>
  );

  const authSection = loading ? (
    <Button variant="outline" disabled className="min-w-[70px]">
      &nbsp;
    </Button>
  ) : user ? (
    <>
      <span className="text-sm text-muted-foreground truncate max-w-[200px]">
        {user.email}
      </span>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </>
  ) : (
    <Link href="/login" className={buttonVariants({ variant: "outline" })}>
      Log in
    </Link>
  );

  return (
    <nav
      aria-label="Primary"
      className="flex items-center justify-between border-b border-foreground/8 px-6 py-3 backdrop-blur-sm bg-background/85"
    >
      <Link href="/" className="flex items-center gap-2">
        {/* Brand wordmark — no logo asset exists; an inline mark keeps the
            nav legible without a missing-image warning. */}
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--brass)] font-display text-[15px] font-semibold text-[var(--ink)]"
        >
          §
        </span>
        <span className="text-lg font-display font-semibold tracking-tight">
          LeaseBrief
        </span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks}
        <div className="flex items-center gap-3">{authSection}</div>
      </div>

      {/* Mobile hamburger menu */}
      {/* SheetTrigger renders its own <button> — do NOT wrap a <Button> inside.
          Style via buttonVariants() per ui/shadcn.md guidance. */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <SheetTitle className="sr-only">Site navigation</SheetTitle>
            <div className="flex flex-col gap-5 mt-8">
              {navLinks}
              <div className="flex flex-col gap-3 pt-3 border-t border-foreground/10">
                {authSection}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
