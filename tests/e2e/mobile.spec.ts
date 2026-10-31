import { test, expect } from "@playwright/test";

test("carte client de démonstration sur mobile", async ({ page }) => {
  await page.goto("/demo");
  await page.getByTestId("demo-hub-customer").click();
  await expect(page).toHaveURL(/\/carte\//);
  await expect(page.getByTestId("customer-balance")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});

test("landing sans débordement horizontal sur mobile", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
