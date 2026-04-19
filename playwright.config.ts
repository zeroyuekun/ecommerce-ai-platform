import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests for public storefront pages.
 *
 * Scope: static/SSG pages that don't require authentication or live Sanity
 * data. Deeper flows (cart persistence, checkout) are covered by the unit
 * and integration suites; expanding e2e to those requires a seeded test
 * dataset and is tracked as v3 work.
 *
 * Run locally: pnpm test:e2e
 * Run with UI: pnpm test:e2e:ui
 *
 * The webServer boots Next.js on a dedicated port (3101) so it doesn't
 * collide with whatever is running on 3000. Set PLAYWRIGHT_BASE_URL to
 * point at an already-running server (e.g. a preview deploy) and the
 * webServer block is skipped.
 *
 * CI: runs only when `E2E` env var is set, since the dev server requires
 * real Sanity/Clerk/Stripe credentials to boot.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3101);
const DEFAULT_BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Dev-mode first compile is the bottleneck; 4 workers balance speed
  // against the dev bundler's concurrent-compile cost on laptop hardware.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `cross-env PORT=${PORT} pnpm dev`,
        url: DEFAULT_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
