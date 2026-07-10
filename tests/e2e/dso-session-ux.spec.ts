import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const screenshotDir = "artifacts/dso-ux-screenshots";

async function openDsoPlanner(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /DSO Planner/i }).click();
  await expect(page.getByText(/\[DSO Session Planner\]/i)).toBeVisible();
}

async function prepareSession(page: import("@playwright/test").Page) {
  await page.getByLabel(/Standortname/i).fill("Geiselhoering");
  await page.getByLabel(/^Breite/i).fill("48.825000");
  await page.getByLabel(/^Laenge/i).fill("12.397000");
  await page.getByLabel(/Hoehe Meter/i).fill("360");
  await page.getByLabel(/Zeitzone/i).fill("Europe/Berlin");
  await page.getByLabel(/Bortle/i).fill("4");
  await page.getByLabel(/SQM/i).fill("21.2");
  await page.getByPlaceholder(/M31, M51/i).fill("M51");
  await page.locator(".dso-object-result").filter({ hasText: "M51" }).first().click();
  await page.getByRole("button", { name: /Zur Session hinzufuegen/i }).click();
  await page.getByPlaceholder(/M31, M51/i).fill("M13");
  await page.locator(".dso-object-result").filter({ hasText: "M13" }).first().click();
  await page.getByRole("button", { name: /Zur Session hinzufuegen/i }).click();
  await page.locator('input[type="date"]').nth(0).fill("2026-09-11");
  await page.locator('input[type="date"]').nth(1).fill("2026-09-18");
  await page.getByLabel(/Gesamtziel effektiv/i).fill("9");
  await page.getByRole("button", { name: /Session neu berechnen/i }).click();
  await expect(page.getByText(/\[Kalender\]/i)).toBeVisible({ timeout: 20000 });
}

test.beforeAll(() => {
  mkdirSync(screenshotDir, { recursive: true });
});

test("captures DSO session UX screenshots", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openDsoPlanner(page);
  await page.screenshot({ path: `${screenshotDir}/01-desktop-input.png`, fullPage: true });
  await prepareSession(page);
  await page.locator("#dso-calendar").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/02-desktop-calendar.png`, fullPage: false });
  await page.locator("#dso-results").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/03-desktop-result.png`, fullPage: false });
  await page.locator("button.dso-calendar-day:not(:disabled)").first().click({ button: "right" });
  await page.screenshot({ path: `${screenshotDir}/07-mobile-context-menu.png`, fullPage: false });
  await page.locator("#dso-fov").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/08-mobile-fov.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 1100 });
  await openDsoPlanner(page);
  await page.screenshot({ path: `${screenshotDir}/04-mobile-input.png`, fullPage: true });
  await prepareSession(page);
  await page.locator("#dso-calendar").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/05-mobile-calendar.png`, fullPage: false });
  await page.locator("#dso-results").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${screenshotDir}/06-mobile-result.png`, fullPage: false });
});
