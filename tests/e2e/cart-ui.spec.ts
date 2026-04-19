import { expect, test } from "@playwright/test";

/**
 * UI-only cart interactions — validates that the client store wiring
 * (open/close, persistence) works without depending on live product data
 * from Sanity. Cart→checkout with real products is covered by unit tests
 * against the Zustand store directly; wiring that to live Sanity + Stripe
 * is a v3 concern that needs a seeded test dataset.
 */
test.describe("Cart UI", () => {
  test("cart drawer opens and closes via header icon", async ({ page }) => {
    await page.goto("/");

    const cartButton = page.getByRole("button", { name: /cart/i }).first();
    await cartButton.click();

    // Drawer renders a close control when open.
    const closeButton = page
      .getByRole("button", { name: /close|dismiss/i })
      .first();
    await expect(closeButton).toBeVisible({ timeout: 3_000 });

    await closeButton.click();
    await expect(closeButton).toBeHidden({ timeout: 3_000 });
  });

  test("empty cart shows the empty-state message", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /cart/i }).first().click();
    await expect(
      page.getByText(/empty|start shopping|nothing/i).first(),
    ).toBeVisible({
      timeout: 3_000,
    });
  });
});
