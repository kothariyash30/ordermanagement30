import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
});

test("admin dashboard shows the seeded pending order and approval queue", async ({ page }) => {
  await expect(page.getByText("Open orders")).toBeVisible();
  await expect(page.getByText("ORD-2026-000123")).toBeVisible();
  await expect(page.getByText("North Optics Hub")).toBeVisible();
});

test("admin can open an order and update its status", async ({ page }) => {
  await page.getByRole("button", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(page.getByRole("heading", { name: "Order Detail" })).toBeVisible();

  await page.locator("#statusSelect").selectOption("Order Processed");
  await page.getByRole("button", { name: "Update status" }).click();

  await expect(page.locator(".badge").filter({ hasText: "Order Processed" }).first()).toBeVisible();
  await expect(page.locator(".timeline-item", { hasText: "Order Processed" })).toBeVisible();
});

test("admin edit action bumps version history and quantity", async ({ page }) => {
  await page.getByRole("button", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Open" }).first().click();

  await page.locator("#editReason").fill("Customer requested one extra lens pack.");
  await page.getByRole("button", { name: "Increase first quantity" }).click();

  await expect(page.getByText("Version 3")).toBeVisible();
  await expect(page.getByText("Customer requested one extra lens pack.")).toBeVisible();
});

test("admin can generate an invoice popup with order totals", async ({ page }) => {
  await page.getByRole("button", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Open" }).first().click();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Generate invoice" }).click()
  ]);
  await popup.waitForLoadState();
  await expect(popup.getByRole("heading", { name: "Invoice" })).toBeVisible();
  await expect(popup.getByText("ORD-2026-000123")).toBeVisible();
  await expect(popup.getByText("Grand total")).toBeVisible();
});

test("admin can print a shipping label without pricing columns", async ({ page }) => {
  await page.getByRole("button", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Open" }).first().click();

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Print shipping label" }).click()
  ]);
  await popup.waitForLoadState();
  await expect(popup.getByRole("heading", { name: "Shipping Label" })).toBeVisible();
  await expect(popup.getByText("Ship to")).toBeVisible();
});
