import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "dealer@lensflow.local");
});

test("dealer can browse the catalog and open a product", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await expect(page.getByRole("heading", { name: "Product Catalog" })).toBeVisible();
  await page.getByRole("button", { name: "Open product" }).first().click();
  await expect(page.getByRole("heading", { name: "AquaLux Daily Clear" })).toBeVisible();
});

test("adding a quantity below the variant MOQ is rejected", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  await page.locator('input[name="power"]').fill("-2.00");
  await page.locator('input[name="baseCurve"]').fill("8.6");
  await page.locator('input[name="diameter"]').fill("14.2");
  await page.locator('input[name="quantity"]').fill("1");

  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Add to cart" }).click();
  expect(alertMessage).toContain("Minimum order quantity");
  await expect(page.getByRole("heading", { name: "AquaLux Daily Clear" })).toBeVisible();
});

test("dealer can add a valid line to cart and submit an order", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  await page.locator('input[name="power"]').fill("-2.00");
  await page.locator('input[name="baseCurve"]').fill("8.6");
  await page.locator('input[name="diameter"]').fill("14.2");
  await page.locator('input[name="quantity"]').fill("6");
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("AquaLux Daily Clear")).toBeVisible();

  await page.getByRole("button", { name: "Submit order" }).click();
  await expect(page.locator(".badge.warn, .badge.ok").filter({ hasText: "Order Received" })).toBeVisible();

  await page.getByRole("button", { name: "Orders" }).click();
  await expect(page.getByText("Order Received")).toBeVisible();
});

test("cart badge in the sidebar reflects the number of cart lines", async ({ page }) => {
  await expect(page.getByRole("button", { name: /^Cart \(0\)$/ })).toBeVisible();
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();
  await page.locator('input[name="power"]').fill("-2.00");
  await page.locator('input[name="baseCurve"]').fill("8.6");
  await page.locator('input[name="diameter"]').fill("14.2");
  await page.locator('input[name="quantity"]').fill("6");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: /^Cart \(1\)$/ })).toBeVisible();
});
