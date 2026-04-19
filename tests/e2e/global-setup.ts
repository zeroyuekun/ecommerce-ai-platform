import { chromium, type FullConfig } from "@playwright/test";

/**
 * Warm the Next.js dev server before parallel workers fan out. Without
 * this, the first 8 tests all race the initial compile of `/` and time
 * out together on cold starts. Hitting the key pages once serialises
 * the compile so workers can reuse the cache.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://localhost:3101";

  const pagesToWarm = ["/", "/shop", "/about"];
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  for (const path of pagesToWarm) {
    try {
      await page.goto(`${baseURL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
    } catch (err) {
      console.warn(`[global-setup] warmup failed for ${path}:`, err);
    }
  }

  await page.close();
  await ctx.close();
  await browser.close();
}
