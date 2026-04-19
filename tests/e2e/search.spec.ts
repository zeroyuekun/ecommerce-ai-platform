import { expect, test } from "@playwright/test";

test.describe("/search", () => {
  test("empty state renders suggested queries", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(
      page.getByText("cozy nook for a studio apartment"),
    ).toBeVisible();
  });

  test("submitting a query navigates with ?q=", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Search query").fill("leather sofa");
    await page.getByLabel("Search query").press("Enter");
    await page.waitForURL(/\/search\?q=leather\+sofa/);
  });
});
