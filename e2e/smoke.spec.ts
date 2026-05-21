import { test, expect } from "@playwright/test";
import { blockAnalytics, checkNoHorizontalOverflow } from "./helpers";

// Page-load smoke tests — one test per experiment.yaml page + per variant.
// These verify each route renders without runtime errors and the title is
// non-empty. Funnel + interaction tests live in funnel.spec.ts and
// behaviors.spec.ts.

test.describe.serial("LeaseBrief smoke", () => {
  test.beforeEach(async ({ page }) => {
    await blockAnalytics(page);
  });

  test("landing loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  test("signup loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  test("login loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  test("pricing loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  // Auth-gated pages: under DEMO_MODE these short-circuit to a demo user;
  // under real auth they would redirect to /login. Both cases still produce
  // a non-empty title, so the smoke contract holds.
  test("dashboard loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/.+/);
  });

  test("abstract-new loads", async ({ page }) => {
    await page.goto("/abstract-new");
    await expect(page).toHaveTitle(/.+/);
  });

  test("review-queue loads", async ({ page }) => {
    await page.goto("/review-queue");
    await expect(page).toHaveTitle(/.+/);
  });

  test("checkout loads", async ({ page }) => {
    await page.goto("/checkout?plan=pro");
    await expect(page).toHaveTitle(/.+/);
  });

  test("export loads", async ({ page }) => {
    await page.goto("/export");
    await expect(page).toHaveTitle(/.+/);
  });

  // Variants — A/B landing pages under /v/<slug>.
  test("variant speed loads", async ({ page }) => {
    await page.goto("/v/speed");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  test("variant cost loads", async ({ page }) => {
    await page.goto("/v/cost");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });

  test("variant confidential loads", async ({ page }) => {
    await page.goto("/v/confidential");
    await expect(page).toHaveTitle(/.+/);
    await checkNoHorizontalOverflow(page);
  });
});
