import { expect, test } from "@playwright/test";

const finalDir = "design-review/final";

test("captures final terminal design review screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.getByText(/Sun & Moon Position Calculator/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Berechnung starten/i })).toBeVisible();

  await page.screenshot({ path: `${finalDir}/desktop-full.png`, fullPage: true });
  await page.screenshot({ path: `${finalDir}/desktop-above-fold.png`, fullPage: false });

  await page.getByRole("button", { name: /Berechnung starten/i }).click();
  await page.screenshot({ path: `${finalDir}/one-night-2026-07-05.png`, fullPage: true });

  await page.getByRole("button", { name: /DSO Planner/i }).click();
  await expect(page.getByText(/\[DSO Session Planner\]/i)).toBeVisible();
  await page.screenshot({ path: `${finalDir}/multiday-7-nights.png`, fullPage: true });

  await page.getByRole("button", { name: /Sun \/ Moon Tool/i }).click();
  await page.locator(".win98-table").last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${finalDir}/data-grid.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 1100 });
  await page.goto("/");
  await page.screenshot({ path: `${finalDir}/mobile-full.png`, fullPage: true });
});
