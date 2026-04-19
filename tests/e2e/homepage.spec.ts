import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with expected title and hero heading", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kozy/i);

    // HeroBanner renders the page's h1.
    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1).toBeVisible();
  });

  test("primary navigation is visible", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
  });

  test("hero 'Shop Now' CTA points at /shop", async ({ page }) => {
    await page.goto("/");
    const shopCta = page.getByRole("link", { name: /shop now/i }).first();
    await expect(shopCta).toBeVisible();
    // Asserting href is more reliable than clicking — the hero banner
    // overlays a full-bleed image that can flake on first paint. The
    // contract we care about is that the CTA *points* at the shop page.
    await expect(shopCta).toHaveAttribute("href", /\/shop/);
  });

  test("shop page loads when navigated directly", async ({ page }) => {
    const response = await page.goto("/shop");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("has no relevant console errors on initial render", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out known third-party noise and browser policy warnings that
    // surface as console errors: Sanity Live websocket warnings in dev,
    // Clerk telemetry in non-prod, resource 404s from optional analytics,
    // and the CSP `upgrade-insecure-requests` info message that browsers
    // always emit for report-only policies.
    const relevant = errors.filter(
      (e) =>
        !/clerk/i.test(e) &&
        !/sanity/i.test(e) &&
        !/Failed to load resource/i.test(e) &&
        !/posthog/i.test(e) &&
        !/upgrade-insecure-requests/i.test(e) &&
        !/Permissions-Policy header/i.test(e),
    );
    expect(relevant).toEqual([]);
  });
});
