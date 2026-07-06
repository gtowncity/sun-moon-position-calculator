import { expect, test } from "@playwright/test";

const finalDir = "design-review/final";

test("captures final terminal design review screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.getByText(/SUN\/MOON ASTRO TERMINAL/i)).toBeVisible();
  await expect(page.locator(".terminal-hero")).toBeVisible();
  await expect(page.locator(".terminal-timeline-track")).toBeVisible();

  await page.screenshot({ path: `${finalDir}/desktop-full.png`, fullPage: true });
  await page.screenshot({ path: `${finalDir}/desktop-above-fold.png`, fullPage: false });

  await page.locator('input[type="date"]').first().fill("2026-07-05");
  await page.getByRole("button", { name: /analyze night/i }).click();
  await page.screenshot({ path: `${finalDir}/one-night-2026-07-05.png`, fullPage: true });

  await page.getByRole("tab", { name: /multiple|mehrere/i }).click();
  await page.getByRole("button", { name: /7 days|7 tage/i }).click();
  await page.screenshot({ path: `${finalDir}/multiday-7-nights.png`, fullPage: true });

  await page.locator(".result-data-grid-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${finalDir}/data-grid.png`, fullPage: false });

  await page.getByRole("button", { name: /crt fx/i }).click();
  await expect(page.getByRole("button", { name: /crt fx/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 1100 });
  await page.goto("/");
  await page.screenshot({ path: `${finalDir}/mobile-full.png`, fullPage: true });
});
