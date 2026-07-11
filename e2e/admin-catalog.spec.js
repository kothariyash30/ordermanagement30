import { test, expect } from "@playwright/test";
import { resetSeed, login, waitForSync } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Catalog" }).click();
});

test("admin can add a new product and it appears in the catalog table", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  await page.locator('input[name="name"]').fill("TestLens Extreme");
  await page.locator('input[name="sku"]').fill("TL-EXTREME");
  await page.locator('input[name="minOrderQty"]').fill("5");
  await page.locator('input[name="priceDealer"]').fill("100");
  await page.locator('input[name="priceRetailer"]').fill("150");
  await page.locator('input[name="gstRate"]').fill("12");
  await page.locator('textarea[name="description"]').fill("A product added by an automated test.");
  await page.locator('input[name="variantName0"]').fill("Standard");
  await page.locator('input[name="variantSku0"]').fill("TL-EXTREME-STD");
  await page.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByRole("heading", { name: "Catalog Management" })).toBeVisible();
  await expect(page.getByText("TestLens Extreme")).toBeVisible();
});

test("admin can deactivate a product and it disappears from the dealer-facing catalog", async ({ page }) => {
  const row = page.locator("tr", { hasText: "AquaLux Daily Clear" });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Inactive")).toBeVisible();

  await waitForSync(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "dealer@lensflow.local");
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await expect(page.getByRole("heading", { name: "AquaLux Daily Clear" })).toHaveCount(0);
});
