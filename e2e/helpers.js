const API_BASE_URL = "http://localhost:8080";

const DEMO_PASSWORDS = {
  "admin@lensflow.local": "admin123",
  "ops@lensflow.local": "ops123",
  "dealer@lensflow.local": "dealer123",
  "retailer@lensflow.local": "retailer123",
  "north@example.com": "north123"
};

export async function resetSeed(request) {
  // /api/reset-seed is admin-only, so authenticate first to get a token.
  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email: "admin@lensflow.local", password: DEMO_PASSWORDS["admin@lensflow.local"] }
  });
  if (!loginResponse.ok()) {
    throw new Error(`Failed to authenticate for seed reset: ${loginResponse.status()}`);
  }
  const { token } = await loginResponse.json();
  const response = await request.post(`${API_BASE_URL}/api/reset-seed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok()) {
    throw new Error(`Failed to reset seed data: ${response.status()}`);
  }
}

export async function login(page, email) {
  await page.goto("/");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORDS[email] || "wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Even without the old artificial debounce, saves still go over the network,
// so a reload immediately after a mutating action can race the in-flight PUT.
// See e2e/known-issues.spec.js. Call this before any reload that must observe
// a just-made change.
export async function waitForSync(page) {
  await page.waitForTimeout(400);
}
