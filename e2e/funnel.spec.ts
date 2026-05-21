import { test, expect } from "@playwright/test";
import {
  captureAnalytics,
  getTestCredentials,
  login,
  type CapturedEvent,
} from "./helpers";

// LeaseBrief funnel — drives the experiment.yaml golden_path:
//   1. landing (landing_view)
//   2. click "Abstract a Lease Free" CTA (cta_click) → /signup
//   3. signup (signup_complete) → /dashboard
//   4. dashboard upload (abstract_started) → /abstract/<id>
//   5. approve abstract (abstract_completed)
//
// Auth-dependent steps are wrapped in test.skip under DEMO_MODE — global-setup
// returns empty credentials when Supabase is unreachable.

test.describe.serial("User funnel", () => {
  let analytics: CapturedEvent[];

  test.beforeEach(async ({ page }) => {
    analytics = await captureAnalytics(page);
  });

  test("landing renders headline + primary CTA", async ({ page }) => {
    await page.goto("/");
    // The landing page renders the chosen variant; speed is the default.
    await expect(page).toHaveTitle(/LeaseBrief/i);
    // CTA appears at least twice (hero + footer) — .first() is required.
    const cta = page.getByRole("link", { name: /abstract a lease free/i }).first();
    await expect(cta).toBeVisible();
  });

  test("clicking landing CTA navigates to /signup", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /abstract a lease free/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("signup → dashboard (auth required)", async ({ page }) => {
    test.skip(
      process.env.DEMO_MODE === "true",
      "DB-dependent — re-run after /deploy or with real Supabase",
    );
    const { email, password } = getTestCredentials();
    test.skip(!email, "No test credentials — Supabase setup may have failed");
    await login(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("analytics events fired in funnel order", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /abstract a lease free/i })
      .first()
      .click();
    await page.waitForURL(/\/signup/);
    const events = analytics.map((e) => e.event);
    expect(events).toContain("landing_view");
    expect(events).toContain("cta_click");
  });
});
