import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Reports" }).click();
});

test("order status report shows every workflow status with its order count", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Order status" })).toBeVisible();

  // Scope to the Order status panel specifically - other Reports tables
  // (pending orders, order aging) also render status text on the same page.
  const section = page.locator("section", { hasText: "Order status" });
  const row = (status) => section.locator("tr", { hasText: status });
  // Seed data has exactly one order, in "Payment Received".
  await expect(row("Payment Received").locator("td").nth(1)).toHaveText("1");
  await expect(row("Order Received").locator("td").nth(1)).toHaveText("0");
  await expect(row("Closed").locator("td").nth(1)).toHaveText("0");
});

test("order status count goes up when an order moves into a new status", async ({ page }) => {
  await page.getByRole("button", { name: "Orders" }).click();
  await page.getByRole("button", { name: "Open" }).first().click();
  await page.locator("#statusSelect").selectOption("Order Processed");
  await page.getByRole("button", { name: "Update status" }).click();

  await page.getByRole("button", { name: "Reports" }).click();
  const section = page.locator("section", { hasText: "Order status" });
  const row = (status) => section.locator("tr", { hasText: status });
  await expect(row("Order Processed").locator("td").nth(1)).toHaveText("1");
  await expect(row("Payment Received").locator("td").nth(1)).toHaveText("0");
});
