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
  await expect(page.getByRole("heading", { name: "Aura NetraLens Daily Clear" })).toBeVisible();
});

test("adding a quantity below the variant MOQ is rejected", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  // Aura NetraLens Daily Clear defaults to the "30 Lens Pack" variant (MOQ 6).
  await page.locator('select[name="power-0"]').selectOption({ label: "-2.00" });
  await page.locator('input[name="quantity-0"]').fill("1");

  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Add all to cart" }).click();
  expect(alertMessage).toContain("Minimum order quantity");
  await expect(page.getByRole("heading", { name: "Aura NetraLens Daily Clear" })).toBeVisible();
});

test("dealer can add a valid line to cart and submit an order", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  await page.locator('select[name="power-0"]').selectOption({ label: "-2.00" });
  await page.locator('input[name="quantity-0"]').fill("6");
  await expect(page.locator("#pricePreview-0")).toHaveText("Rs 245");
  await page.getByRole("button", { name: "Add all to cart" }).click();

  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Aura NetraLens Daily Clear")).toBeVisible();

  await page.getByRole("button", { name: "Submit order" }).click();
  await expect(page.locator(".badge.warn, .badge.ok").filter({ hasText: "Order Received" })).toBeVisible();

  await page.getByRole("button", { name: "Orders" }).click();
  await expect(page.getByText("Order Received")).toBeVisible();
});

test("cart badge in the sidebar reflects the number of cart lines", async ({ page }) => {
  await expect(page.getByRole("button", { name: /^Cart \(0\)$/ })).toBeVisible();
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();
  await page.locator('select[name="power-0"]').selectOption({ label: "-2.00" });
  await page.locator('input[name="quantity-0"]').fill("6");
  await page.getByRole("button", { name: "Add all to cart" }).click();
  await expect(page.getByRole("button", { name: /^Cart \(1\)$/ })).toBeVisible();
});

test("tiered-pricing product resolves a different price above/below the power threshold", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.locator(".catalog-card", { hasText: "Aura NetraLens Precision Monthly" }).getByRole("button", { name: "Open product" }).click();
  await expect(page.getByRole("heading", { name: "Aura NetraLens Precision Monthly" })).toBeVisible();

  await page.locator('select[name="variantId-0"]').selectOption({ label: "1 Pair Pack" });
  await page.locator('select[name="power-0"]').selectOption({ label: "-8.00" });
  await expect(page.locator("#pricePreview-0")).toHaveText("Rs 650");

  await page.locator('select[name="power-0"]').selectOption({ label: "-11.00" });
  await expect(page.locator("#pricePreview-0")).toHaveText("Rs 800");
});

test("dealer can add two different power options for the same product in one go", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  await page.locator('select[name="power-0"]').selectOption({ label: "-2.00" });
  await page.locator('input[name="quantity-0"]').fill("6");

  await page.getByRole("button", { name: "+ Add another power" }).click();
  await page.locator('select[name="power-1"]').selectOption({ label: "-4.00" });
  await page.locator('input[name="quantity-1"]').fill("6");

  await page.getByRole("button", { name: "Add all to cart" }).click();

  await expect(page.getByRole("button", { name: /^Cart \(2\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Power -2.00")).toBeVisible();
  await expect(page.getByText("Power -4.00")).toBeVisible();
});

test("removing a power row before submitting drops it from the cart", async ({ page }) => {
  await page.getByRole("button", { name: "Product Catalog" }).click();
  await page.getByRole("button", { name: "Open product" }).first().click();

  await page.locator('select[name="power-0"]').selectOption({ label: "-2.00" });
  await page.locator('input[name="quantity-0"]').fill("6");

  await page.getByRole("button", { name: "+ Add another power" }).click();
  await page.locator('select[name="power-1"]').selectOption({ label: "-4.00" });
  await page.locator('input[name="quantity-1"]').fill("6");
  await page.getByRole("button", { name: "Remove this power" }).click();

  await page.getByRole("button", { name: "Add all to cart" }).click();
  await expect(page.getByRole("button", { name: /^Cart \(1\)$/ })).toBeVisible();
});
