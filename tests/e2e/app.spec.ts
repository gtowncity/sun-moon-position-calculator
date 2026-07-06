import { test, expect } from "@playwright/test";

test("calculates in the terminal UI and exposes active exports", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/SUN\/MOON ASTRO TERMINAL/i)).toBeVisible();
  await page.getByRole("button", { name: /analyze night/i }).click();
  await expect(page.getByRole("button", { name: /^csv$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^xlsx$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^txt$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /markdown/i })).toBeVisible();
});
