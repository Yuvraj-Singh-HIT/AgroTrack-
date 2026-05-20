import { test, expect } from "@playwright/test";

test("auth page loads", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
});

test("protected dashboard redirects to auth", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth/);
});
