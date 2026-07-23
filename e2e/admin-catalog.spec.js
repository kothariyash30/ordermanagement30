import { test, expect } from "@playwright/test";
import { resetSeed, login, waitForSync } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Catalog" }).click();
});

test("admin can add a new sphere-power product and it appears in the catalog table", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  await page.locator('select[name="categoryId"]').selectOption({ label: "Optical Lens - Sphere Power" });
  await page.locator('input[name="name"]').fill("TestLens Extreme");
  await page.locator('input[name="sku"]').fill("TL-EXTREME");
  await page.locator('input[name="productType"]').fill("Monthly Disposable");
  await page.locator('input[name="replacementSchedule"]').fill("Monthly");
  await page.locator('input[name="material"]').fill("Silicone Hydrogel");
  await page.locator('input[name="waterContent"]').fill("45%");
  await page.locator('input[name="diameter"]').fill("14.2mm");
  await page.locator('input[name="baseCurve"]').fill("8.6mm");
  await page.locator('input[name="manufacturingMethod"]').fill("Cast Molded");
  await page.locator('input[name="gstRate"]').fill("12");
  await page.locator('textarea[name="description"]').fill("A product added by an automated test.");

  await page.locator('input[name="powerStart0"]').fill("0");
  await page.locator('input[name="powerEnd0"]').fill("-4");
  await page.locator('input[name="powerStep0"]').fill("0.25");

  await page.locator('textarea[name="colorValues"]').fill("Blue");

  await page.locator('input[name="flatMrp"]').fill("150");
  await page.locator('input[name="flatDealer"]').fill("100");
  await page.locator('input[name="flatRetailer"]').fill("150");
  await page.locator('input[name="minOrderQty"]').fill("5");

  await page.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByRole("heading", { name: "Catalog Management" })).toBeVisible();
  await expect(page.getByText("TestLens Extreme")).toBeVisible();
  await expect(page.locator("tr", { hasText: "TestLens Extreme" }).getByText("Blue")).toBeVisible();
});

test("uploading a non-image file for the thumbnail is rejected with an alert", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  const fileInput = page.locator('input[type="file"]').first();

  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  await fileInput.setInputFiles({ name: "not-an-image.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  expect(alertMessage).toContain("is not an image file");
});

test("uploading an oversized image for the thumbnail is rejected with an alert", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  const fileInput = page.locator('input[type="file"]').first();

  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  const oversizedBuffer = Buffer.alloc(4 * 1024 * 1024); // 4MB, over the 3MB cap
  await fileInput.setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: oversizedBuffer });
  expect(alertMessage).toContain("larger than 3MB");
});

test("selecting a plano category hides the optical parameters block", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.locator("#opticalParamsBlock")).toBeVisible();
  await page.locator('select[name="categoryId"]').selectOption({ label: "Plano / Cosmetic (No Power)" });
  await expect(page.locator("#opticalParamsBlock")).toBeHidden();
});

test("switching to tiered pricing hides the flat pricing block", async ({ page }) => {
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.locator("#flatPricingBlock")).toBeVisible();
  await expect(page.locator("#tieredPricingBlock")).toBeHidden();
  await page.locator('select[name="pricingMode"]').selectOption("tiered");
  await expect(page.locator("#flatPricingBlock")).toBeHidden();
  await expect(page.locator("#tieredPricingBlock")).toBeVisible();
});

test("admin can deactivate a product and it disappears from the dealer-facing catalog", async ({ page }) => {
  const row = page.locator("tr", { hasText: "Aura NetraLens Daily Clear" });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Inactive")).toBeVisible();

  await waitForSync(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "dealer@lensflow.local");
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await expect(page.getByRole("heading", { name: "Aura NetraLens Daily Clear" })).toHaveCount(0);
});
