import { test, expect } from "@playwright/test";
import { resetSeed, login } from "./helpers.js";

// This test documents a real, inherent limitation, not test flakiness.
//
// app.js fires the PUT /api/state save as soon as an action happens (the
// artificial 250ms debounce that used to sit in front of it has been
// removed), but it is still a fire-and-forget network request with no
// acknowledgement/loading indicator. Anyone else who reads the shared
// workspace (a second browser tab, or another user) while that PUT is still
// in flight sees stale data - only the write's own network latency stands
// between "change made" and "change durable", and nothing blocks a
// concurrent read from landing in that window.
//
// Racing on wall-clock timing to prove this would be flaky, so instead we
// deterministically hold up the PUT with route interception and prove a
// concurrent reader sees stale data while it's in flight.
//
// test.fail() marks this as "expected to currently fail" so it turns into a
// build break - a prompt to update this file - the day someone adds
// read-after-write consistency (e.g. awaiting the save before allowing
// navigation away), instead of quietly bit-rotting as a skipped test.

test.beforeEach(async ({ request }) => {
  await resetSeed(request);
});

test.fail("BUG: an admin approval is invisible to a concurrent reader while the PUT is in flight", async ({ page, request }) => {
  await login(page, "admin@lensflow.local");

  // Hold the PUT open indefinitely to make the race deterministic instead of timing-dependent.
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "PUT") {
      await new Promise(() => {}); // never resolves for the lifetime of this test
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Dealers & Retailers" }).click();
  await page.locator("tr", { hasText: "North Optics Hub" }).getByRole("button", { name: "Open" }).click();
  await page.locator("#approvalCustomerType").selectOption("retailer");
  await page.getByRole("button", { name: "Approve" }).click();

  // A concurrent reader (another tab/user) hitting the API directly right now
  // should, in a correct system, either see the update or block until it's
  // durable. Instead it silently sees the pre-approval seed data.
  const loginResponse = await request.post("http://localhost:8080/api/auth/login", {
    data: { email: "admin@lensflow.local", password: "admin123" }
  });
  const { token } = await loginResponse.json();
  const state = await (await request.get("http://localhost:8080/api/state", {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  const northOptics = state.customers.find((c) => c.name === "North Optics Hub");
  expect(northOptics.status).toBe("Approved");
});
