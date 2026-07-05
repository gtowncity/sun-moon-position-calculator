import { test, expect } from "@playwright/test";

test("calculates a manual Sun position and exposes CSV export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /position/i })).toBeVisible();
  await page.getByRole("button", { name: /calculate|berechnen/i }).click();
  await expect(page.getByRole("button", { name: /^csv$/i })).toBeVisible();
});
