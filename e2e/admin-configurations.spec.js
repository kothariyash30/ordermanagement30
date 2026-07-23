import { test, expect } from "@playwright/test";
import { resetSeed, login, waitForSync } from "./helpers.js";

test.beforeEach(async ({ request, page }) => {
  await resetSeed(request);
  await login(page, "admin@lensflow.local");
  await page.getByRole("button", { name: "Configurations" }).click();
});

test("admin can save Gmail, WhatsApp and SMS integration settings, and they persist across reload", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Configurations" })).toBeVisible();

  await page.locator('select[name="gmailEnabled"]').selectOption("true");
  await page.locator('input[name="gmailEmailAddress"]').fill("orders@lensflow.local");
  await page.locator('input[name="gmailAppPassword"]').fill("app-pass-1234");
  await page.locator('input[name="gmailSenderName"]').fill("LensFlow Orders");

  await page.locator('select[name="whatsappEnabled"]').selectOption("true");
  await page.locator('input[name="whatsappBusinessPhoneNumberId"]').fill("1234567890");
  await page.locator('input[name="whatsappAccessToken"]').fill("wa-token-abcd");
  await page.locator('input[name="whatsappFromPhoneNumber"]').fill("+911234567890");

  await page.locator('select[name="smsEnabled"]').selectOption("true");
  await page.locator('input[name="smsProvider"]').fill("Twilio");
  await page.locator('input[name="smsApiKey"]').fill("sms-key-5678");
  await page.locator('input[name="smsSenderId"]').fill("LNSFLW");

  // saveIntegrationConfigs() now awaits a real save to its own dedicated
  // endpoint before alerting, so the dialog reliably fires after the click's
  // own promise resolves - Promise.all + waitForEvent is the correct pattern
  // here (same as the other async-then-alert flows in this suite).
  const [dialog] = await Promise.all([
    page.waitForEvent("dialog"),
    page.getByRole("button", { name: "Save configuration" }).click()
  ]);
  const alertMessage = dialog.message();
  await dialog.accept();
  expect(alertMessage).toContain("Configuration saved");

  // Saved credentials must never sit in localStorage - they're persisted
  // through their own dedicated endpoint, not the generic state cache.
  const cachedState = await page.evaluate(() => localStorage.getItem("oms-demo-state-v1"));
  expect(JSON.parse(cachedState).integrationConfigs).toBeUndefined();

  await waitForSync(page);
  await page.reload();
  // A reload always lands on the role's default view (Admin Dashboard) - navigate back.
  await page.waitForSelector("text=Admin Dashboard");
  await page.getByRole("button", { name: "Configurations" }).click();
  await expect(page.getByRole("heading", { name: "Configurations" })).toBeVisible();

  await expect(page.locator('input[name="gmailEmailAddress"]')).toHaveValue("orders@lensflow.local");
  await expect(page.locator('input[name="whatsappFromPhoneNumber"]')).toHaveValue("+911234567890");
  await expect(page.locator('input[name="smsSenderId"]')).toHaveValue("LNSFLW");
});

test("a dealer/retailer session has no Configurations nav item and never receives the saved credentials", async ({ page, request }) => {
  await page.locator('select[name="gmailEnabled"]').selectOption("true");
  await page.locator('input[name="gmailEmailAddress"]').fill("secret@lensflow.local");
  await page.locator('input[name="gmailAppPassword"]').fill("super-secret-password");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save configuration" }).click();
  await waitForSync(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "dealer@lensflow.local");
  await expect(page.getByRole("button", { name: "Configurations" })).toHaveCount(0);

  const loginResponse = await request.post("http://localhost:8080/api/auth/login", {
    data: { email: "dealer@lensflow.local", password: "dealer123" }
  });
  const { token } = await loginResponse.json();
  const state = await (await request.get("http://localhost:8080/api/state", { headers: { Authorization: `Bearer ${token}` } })).json();
  expect(state.integrationConfigs).toBeUndefined();
});
