import { test, expect } from "@playwright/test";
import { resetSeed, login, waitForSync } from "./helpers.js";

test.beforeEach(async ({ request }) => {
  await resetSeed(request);
});

test("admin can log in and sees the admin dashboard", async ({ page }) => {
  await login(page, "admin@lensflow.local");
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  await expect(page.getByText("Admin console")).toBeVisible();
});

test("approved dealer can log in and sees the customer dashboard", async ({ page }) => {
  await login(page, "dealer@lensflow.local");
  await expect(page.getByRole("heading", { name: "Customer Dashboard" })).toBeVisible();
  await expect(page.getByText("Dealer/Retailer portal")).toBeVisible();
});

test("approved retailer can log in and sees the customer dashboard", async ({ page }) => {
  await login(page, "retailer@lensflow.local");
  await expect(page.getByRole("heading", { name: "Customer Dashboard" })).toBeVisible();
});

test("unknown email is rejected with a generic alert (not distinguishable from a wrong password)", async ({ page }) => {
  // Login now makes a real network round-trip before alerting, so the dialog
  // no longer fires synchronously within the click - wait for it explicitly
  // instead of reading a variable immediately after the triggering action.
  const [dialog] = await Promise.all([page.waitForEvent("dialog"), login(page, "nobody@example.com")]);
  const message = dialog.message();
  await dialog.accept();
  expect(message).toContain("Invalid email or password");
});

test("pending-approval account cannot log in", async ({ page }) => {
  const [dialog] = await Promise.all([page.waitForEvent("dialog"), login(page, "north@example.com")]);
  const message = dialog.message();
  await dialog.accept();
  expect(message).toContain("PendingApproval");
});

test("registration creates a pending-approval account that still cannot sign in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Register" }).click();
  await page.locator('input[name="name"]').fill("Test Optics Co");
  await page.locator('input[name="contactPerson"]').fill("Jamie Test");
  await page.locator('input[name="phone"]').fill("+91 90000 00001");
  await page.locator('input[name="email"]').fill("jamie@test-optics.example");
  await page.locator('input[name="password"]').fill("JamieTestPass1");
  await page.locator('input[name="gstin"]').fill("29TESTG1234H1Z1");
  await page.locator('input[name="line1"]').fill("1 Test Lane");
  await page.locator('input[name="city"]').fill("Bengaluru");
  await page.locator('input[name="state"]').fill("Karnataka");
  await page.locator('input[name="pincode"]').fill("560001");

  const [registerDialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Submit for approval" }).click()
  ]);
  const registerMessage = registerDialog.message();
  await registerDialog.accept();
  expect(registerMessage).toContain("Registration submitted");

  await waitForSync(page);
  await page.goto("/");
  await page.locator('input[name="email"]').fill("jamie@test-optics.example");
  await page.locator('input[name="password"]').fill("JamieTestPass1");
  const [loginDialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Sign in" }).click()
  ]);
  const loginMessage = loginDialog.message();
  await loginDialog.accept();
  expect(loginMessage).toContain("PendingApproval");
});
