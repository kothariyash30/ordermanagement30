import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

const BREAKPOINTS = [
  { name: "mobile", width: 320, height: 720 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 800 },
  { name: "desktop", width: 1440, height: 900 }
];

test.beforeEach(async ({ request }) => {
  await resetSeed(request);
});

for (const bp of BREAKPOINTS) {
  test(`login page has no horizontal overflow at ${bp.name} (${bp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Orders, pricing, approvals/ })).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasOverflow).toBe(false);
  });

  test(`admin dashboard has no horizontal overflow at ${bp.name} (${bp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await login(page, "admin@lensflow.local");
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(hasOverflow).toBe(false);
  });
}
