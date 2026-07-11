import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Admin Users" }).click();
});

test("admin can create a new admin user with a real password, and that password works to log in", async ({ page }) => {
  await page.getByRole("button", { name: "Add admin user" }).click();
  await page.locator('input[name="name"]').fill("Priya Staffer");
  await page.locator('input[name="email"]').fill("priya@lensflow.local");
  await page.locator('input[name="password"]').fill("PriyaPass123");
  await page.getByRole("button", { name: "Create admin user" }).click();

  await expect(page.getByRole("heading", { name: "Admin User Management" })).toBeVisible();
  await expect(page.getByText("Priya Staffer")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  // login() only knows the fixed demo passwords, not this new account's - fill directly.
  await page.goto("/");
  await page.locator('input[name="email"]').fill("priya@lensflow.local");
  await page.locator('input[name="password"]').fill("PriyaPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
});

test("Super Admin row has no reset-password or remove button", async ({ page }) => {
  const superAdminRow = page.locator("tr", { hasText: "Super Admin" });
  await expect(superAdminRow.getByRole("button", { name: "Reset password" })).toHaveCount(0);
  await expect(superAdminRow.getByRole("button", { name: "Remove" })).toHaveCount(0);
});

test("admin can reset Operations Staff's password and log in with the new one", async ({ page }) => {
  const opsRow = page.locator("tr", { hasText: "Operations Staff" });
  await opsRow.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await page.locator('input[name="password"]').fill("OpsNewPass123");

  const [dialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Reset password" }).click()
  ]);
  await dialog.accept();

  await page.getByRole("button", { name: "Sign out" }).click();

  // The old demo password (ops123) no longer works, via the login() helper's default lookup.
  const [failDialog] = await Promise.all([page.waitForEvent("dialog"), login(page, "ops@lensflow.local")]);
  const failMessage = failDialog.message();
  await failDialog.accept();
  expect(failMessage).toContain("Invalid email or password");

  // The new password does.
  await page.goto("/");
  await page.locator('input[name="email"]').fill("ops@lensflow.local");
  await page.locator('input[name="password"]').fill("OpsNewPass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
});
