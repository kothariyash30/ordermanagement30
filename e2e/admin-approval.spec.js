import { test, expect } from "@playwright/test";
import { resetSeed, login, waitForSync } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
});

test("approving a pending registration requires an account type", async ({ page }) => {
  await page.getByRole("button", { name: "Dealers & Retailers" }).click();
  await page.getByRole("button", { name: "Open" }).filter({ hasText: "Open" }).last().click();
  await expect(page.getByRole("heading", { name: "Registration Review" })).toBeVisible();

  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Approve" }).click();
  expect(alertMessage).toContain("Assign Dealer or Retailer");
});

test("admin can approve North Optics Hub as a retailer and it can then log in", async ({ page }) => {
  await page.getByRole("button", { name: "Dealers & Retailers" }).click();
  await page.locator("tr", { hasText: "North Optics Hub" }).getByRole("button", { name: "Open" }).click();
  await page.locator("#approvalCustomerType").selectOption("retailer");
  await page.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByText("Not assigned")).toHaveCount(0);

  await waitForSync(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "north@example.com");
  await expect(page.getByRole("heading", { name: "Customer Dashboard" })).toBeVisible();
});

test("admin can suspend an approved customer", async ({ page }) => {
  await page.getByRole("button", { name: "Dealers & Retailers" }).click();
  const row = page.locator("tr", { hasText: "ClearSight Distributors" });
  await row.getByRole("button", { name: "Suspend" }).click();
  await expect(page.locator("tr", { hasText: "ClearSight Distributors" }).getByText("Suspended")).toBeVisible();
});
