"use client";

import { useEffect } from "react";
import { trackRetainReturn } from "@/lib/events";

// RetainTracker — client component mounted in the root layout.
// Reads `last_visit_ts` from localStorage on every page load. If the user
// last visited ≥ 24h ago, fire `retain_return` with days_since_first.
// Always updates last_visit_ts to "now" before unmount.
//
// This is the canonical retain_return surface per
// framework/nextjs.md → retain_return Tracking. The dashboard upload zone
// (b-11) does NOT fire retain_return — that's the RetainTracker's job, so
// retain_return is exactly one event per session-with-return-window.
export function RetainTracker() {
  useEffect(() => {
    try {
      const lastVisit = localStorage.getItem("last_visit_ts");
      if (lastVisit) {
        const days = Math.floor(
          (Date.now() - Number(lastVisit)) / 86_400_000,
        );
        if (days >= 1) {
          trackRetainReturn({ days_since_first: days });
        }
      }
      localStorage.setItem("last_visit_ts", String(Date.now()));
    } catch {
      // localStorage unavailable (private mode, sandboxed iframe) — skip silently.
    }
  }, []);

  return null;
}
