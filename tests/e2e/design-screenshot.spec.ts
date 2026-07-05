import { expect, test } from "@playwright/test";

test("captures design review screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /position tool|positionsrechner/i })).toBeVisible();
  await expect(page.locator(".night-hero")).toBeVisible();

  await page.screenshot({ path: "design-review/round-02-redesign/desktop-full.png", fullPage: true });
  await page.screenshot({ path: "design-review/round-02-redesign/desktop-above-fold.png", fullPage: false });

  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({ path: "design-review/round-02-redesign/mobile-full.png", fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.locator(".timeline-sample").nth(2).hover();
  await page.locator(".timeline-sample").nth(2).click();
  await page.screenshot({ path: "design-review/round-03-final/desktop-full.png", fullPage: true });
  await page.screenshot({ path: "design-review/round-03-final/desktop-above-fold.png", fullPage: false });

  await page.getByLabel(/select night|nacht ausw/i).fill("2026-07-05");
  await page.screenshot({ path: "design-review/round-03-final/night-mode-2026-07-05.png", fullPage: true });

  await page.getByRole("button", { name: /7 days|7 tage/i }).click();
  await page.screenshot({ path: "design-review/round-03-final/multiday-7-days.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 1100 });
  await page.screenshot({ path: "design-review/round-03-final/mobile-full.png", fullPage: true });
});
