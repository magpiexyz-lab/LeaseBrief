// @next/env loadEnvConfig: shape depends on loader. .ts (Playwright pirates +
// CJS-transpile) requires NAMED-import; .mjs (raw Node ESM) requires
// default-import + destructure.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT || "3099";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `PORT=${port} npm run dev`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
      },
});
