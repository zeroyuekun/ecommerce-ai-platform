import { expect, test } from "@playwright/test";

/**
 * Each page is exercised by the keyword most likely to appear in its h1.
 * We use regex over exact strings so marketing-copy tweaks don't break
 * these smoke tests; the contract is "page loads and renders *a* primary
 * heading that is topical to the route".
 */
const staticPages: Array<{ path: string; heading: RegExp }> = [
  { path: "/about", heading: /story|kozy|about/i },
  { path: "/contact", heading: /contact/i },
  { path: "/reviews", heading: /reviews/i },
  { path: "/gift-vouchers", heading: /gift vouchers/i },
  { path: "/faq", heading: /frequently asked|faq/i },
  { path: "/shipping", heading: /shipping/i },
  { path: "/returns", heading: /returns/i },
  { path: "/privacy", heading: /privacy/i },
  { path: "/terms", heading: /terms/i },
];

test.describe("Static informational pages", () => {
  for (const { path, heading } of staticPages) {
    test(`${path} renders with expected heading`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);

      const h1 = page.getByRole("heading", { level: 1 }).first();
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(heading);
    });
  }
});

test.describe("Security headers", () => {
  test("homepage response includes hardened headers", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();

    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy-report-only"]).toContain(
      "default-src",
    );
    // Guard against the single-quote regression: Permissions-Policy origin
    // strings must use double quotes per the Structured Fields spec.
    const permissions = headers["permissions-policy"] ?? "";
    expect(permissions).toContain("payment=");
    expect(permissions).not.toMatch(/payment=\([^)]*'[^)]*\)/);
  });
});
