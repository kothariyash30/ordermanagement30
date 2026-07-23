import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await resetSeed(request);
});

test("admin can open the Vertex Calculator and see a live-updating conversion", async ({ page }) => {
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Vertex Calculator" }).click();
  await expect(page.getByRole("heading", { name: "Vertex Distance Calculator" })).toBeVisible();

  // Default sphere (-6.00) already shows its vertex-corrected result (-5.50).
  await expect(page.locator("#vertexResult")).toContainText("-5.50");

  await page.locator('input[name="vxSphere"]').fill("-10");
  await expect(page.locator("#vertexResult")).toContainText("-9.00");

  await page.locator('input[name="vxCyl"]').fill("-2");
  await page.locator('input[name="vxSphere"]').fill("-6");
  await expect(page.locator("#vertexResult")).toContainText("-5.50");
  await expect(page.locator("#vertexResult")).toContainText("-1.75");
});

test("dealer also has access to the Vertex Calculator from their own nav", async ({ page }) => {
  await login(page, "dealer@lensflow.local");
  await page.getByRole("button", { name: "Vertex Calculator" }).click();
  await expect(page.getByRole("heading", { name: "Vertex Distance Calculator" })).toBeVisible();
});

test("an out-of-range power shows an error instead of a bogus result", async ({ page }) => {
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Vertex Calculator" }).click();

  // 1 / 0.012 = 83.333333D is exactly where the vertex formula divides by zero.
  await page.locator('input[name="vxSphere"]').fill("83.333333");
  await expect(page.locator("#vertexResult")).toContainText("too high to vertex-correct");
});

test("clearing the sphere field shows the empty-state prompt", async ({ page }) => {
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Vertex Calculator" }).click();

  await page.locator('input[name="vxSphere"]').fill("");
  await expect(page.locator("#vertexResult")).toContainText("Enter a sphere power");
});
