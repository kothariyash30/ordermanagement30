import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import mongoose from "mongoose";
import { beforeAll, afterAll, beforeEach, describe, test, expect } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 8099;
const BASE_URL = `http://localhost:${PORT}`;
const MONGODB_URI = process.env.INTEGRATION_MONGODB_URI || "mongodb://127.0.0.1:27017/lensflow_oms_integration";
const JWT_SECRET = "integration-test-secret-do-not-use-in-production";

const DEMO_PASSWORDS = {
  "admin@lensflow.local": "admin123",
  "dealer@lensflow.local": "dealer123",
  "retailer@lensflow.local": "retailer123",
  "north@example.com": "north123"
};

let serverProcess;

async function waitForHealth(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Server did not become healthy in time");
}

async function loginAs(email) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORDS[email] })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Login as ${email} failed: ${response.status} ${body.error}`);
  return body.token;
}

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// A leftover AppState document from a previous run (before passwordHash
// existed, or with different seed data) would make getStateDocument() reuse
// stale data instead of reseeding - drop it so every run starts clean.
async function dropExistingState(mongoUri) {
  const connection = await mongoose.createConnection(mongoUri).asPromise();
  await connection.dropDatabase();
  await connection.close();
}

beforeAll(async () => {
  await dropExistingState(MONGODB_URI);
  serverProcess = spawn(process.execPath, [resolve(root, "server/index.js")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(PORT),
      MONGODB_URI,
      CORS_ORIGINS: "http://allowed-origin.example",
      ALLOW_SEED_RESET: "true",
      JWT_SECRET,
      STATE_RATE_LIMIT_MAX: "1000",
      LOGIN_RATE_LIMIT_MAX: "1000"
    },
    stdio: "pipe"
  });
  await waitForHealth(BASE_URL);
});

afterAll(() => {
  serverProcess?.kill();
});

beforeEach(async () => {
  const token = await loginAs("admin@lensflow.local");
  const response = await fetch(`${BASE_URL}/api/reset-seed`, { method: "POST", headers: authHeaders(token) });
  expect(response.ok).toBe(true);
});

describe("GET /health", () => {
  test("reports ok and a connected database, with no auth required", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, database: "connected" });
  });
});

describe("POST /api/auth/login", () => {
  test("issues a token for the correct admin password", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lensflow.local", password: "admin123" })
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.token).toEqual(expect.any(String));
    expect(body.user).toMatchObject({ role: "admin", email: "admin@lensflow.local" });
  });

  test("issues a token for a correctly-passworded approved customer", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dealer@lensflow.local", password: "dealer123" })
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({ role: "customer", customerType: "dealer" });
  });

  test("rejects the wrong password", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lensflow.local", password: "not-the-password" })
    });
    expect(response.status).toBe(401);
  });

  test("rejects an unknown email", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "whatever123" })
    });
    expect(response.status).toBe(401);
  });

  test("rejects a correctly-passworded but not-yet-approved customer", async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "north@example.com", password: "north123" })
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("PendingApproval");
  });

  test("gives the exact same error for an unknown email as for a wrong password, so accounts can't be enumerated", async () => {
    const wrongPassword = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lensflow.local", password: "not-the-password" })
    });
    const unknownEmail = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody-registered@example.com", password: "whatever123" })
    });
    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect((await wrongPassword.json()).error).toBe((await unknownEmail.json()).error);
  });
});

describe("POST /api/customer-actions/register", () => {
  test("creates a PendingApproval customer with a hashed (not plaintext) password", async () => {
    const response = await fetch(`${BASE_URL}/api/customer-actions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Optics Co", contactPerson: "Sam Test", phone: "+91 90000 00009",
        email: "sam@new-optics.example", password: "SamPassword1", gstin: "29SAMG1234H1Z1",
        line1: "1 Sam Lane", city: "Pune", state: "Maharashtra", pincode: "411001"
      })
    });
    expect(response.status).toBe(201);

    const token = await loginAs("admin@lensflow.local");
    const stateResponse = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) });
    const state = await stateResponse.json();
    const created = state.customers.find((c) => c.email === "sam@new-optics.example");
    expect(created.status).toBe("PendingApproval");
    expect(created.passwordHash).toBeUndefined(); // never sent to any client
  });

  test("rejects a password shorter than 8 characters", async () => {
    const response = await fetch(`${BASE_URL}/api/customer-actions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Short Pass Co", contactPerson: "Sam Test", phone: "+91 90000 00009",
        email: "shortpass@example.com", password: "short", gstin: "29SAMG1234H1Z1",
        line1: "1 Sam Lane", city: "Pune", state: "Maharashtra", pincode: "411001"
      })
    });
    expect(response.status).toBe(400);
  });

  test("rejects an email that already exists", async () => {
    const response = await fetch(`${BASE_URL}/api/customer-actions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Co", contactPerson: "Sam Test", phone: "+91 90000 00009",
        email: "dealer@lensflow.local", password: "SamPassword1", gstin: "29SAMG1234H1Z1",
        line1: "1 Sam Lane", city: "Pune", state: "Maharashtra", pincode: "411001"
      })
    });
    expect(response.status).toBe(409);
  });
});

describe("GET /api/state", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/state`);
    expect(response.status).toBe(401);
  });

  test("returns the shared workspace state for an authenticated admin", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.customers.length).toBeGreaterThan(0);
    expect(body.adminUsers.length).toBeGreaterThan(0);
  });

  test("returns the shared workspace state for an authenticated customer", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) });
    expect(response.status).toBe(200);
  });

  test("never includes passwordHash for admins or customers, for any role", async () => {
    const adminToken = await loginAs("admin@lensflow.local");
    const adminView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    expect(adminView.customers.every((c) => !("passwordHash" in c))).toBe(true);
    expect(adminView.adminUsers.every((u) => !("passwordHash" in u))).toBe(true);

    const customerToken = await loginAs("dealer@lensflow.local");
    const customerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(customerToken) })).json();
    expect(customerView.customers.every((c) => !("passwordHash" in c))).toBe(true);
  });

  test("includes integrationConfigs for an admin but never for a customer", async () => {
    const adminToken = await loginAs("admin@lensflow.local");
    const adminView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    expect(adminView.integrationConfigs).toBeDefined();
    expect(adminView.integrationConfigs.gmail).toBeDefined();

    const customerToken = await loginAs("dealer@lensflow.local");
    const customerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(customerToken) })).json();
    expect(customerView.integrationConfigs).toBeUndefined();
  });

  test("a customer session only ever sees its own customer record, never other businesses'", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    const dealerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(dealerToken) })).json();
    expect(dealerView.customers).toHaveLength(1);
    expect(dealerView.customers[0].email).toBe("dealer@lensflow.local");
  });

  test("a customer session never sees another customer's orders", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(dealerToken),
      body: JSON.stringify({ cart: [{ productId: "p1", variantId: "v1", quantity: 6, power: -2.00 }] })
    });

    const retailerToken = await loginAs("retailer@lensflow.local");
    const retailerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(retailerToken) })).json();
    expect(retailerView.orders.every((order) => order.customerId !== "c1")).toBe(true);
  });

  test("a customer session never sees the admin/staff directory", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    const dealerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(dealerToken) })).json();
    expect(dealerView.adminUsers).toEqual([]);
  });

  test("a dealer never sees retailer pricing and a retailer never sees dealer pricing", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    const dealerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(dealerToken) })).json();
    const dealerProduct = dealerView.products.find((p) => p.id === "p1");
    expect(dealerProduct.pricing.flat).not.toHaveProperty("priceRetailer");
    expect(dealerProduct.pricing.flat).toHaveProperty("priceDealer");

    const retailerToken = await loginAs("retailer@lensflow.local");
    const retailerView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(retailerToken) })).json();
    const retailerProduct = retailerView.products.find((p) => p.id === "p1");
    expect(retailerProduct.pricing.flat).not.toHaveProperty("priceDealer");
    expect(retailerProduct.pricing.flat).toHaveProperty("priceRetailer");
  });

  test("an admin session still sees every customer, every order and both pricing tiers", async () => {
    const adminToken = await loginAs("admin@lensflow.local");
    const adminView = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    expect(adminView.customers.length).toBeGreaterThan(1);
    const product = adminView.products.find((p) => p.id === "p1");
    expect(product.pricing.flat).toHaveProperty("priceDealer");
    expect(product.pricing.flat).toHaveProperty("priceRetailer");
  });
});

describe("integration configurations (Gmail/WhatsApp/SMS credentials)", () => {
  const VALID_CONFIGS = {
    gmail: { enabled: true, emailAddress: "orders@lensflow.local", appPassword: "app-pass-1234", senderName: "LensFlow Orders" },
    whatsapp: { enabled: false, businessPhoneNumberId: "", accessToken: "", fromPhoneNumber: "" },
    sms: { enabled: true, provider: "Twilio", apiKey: "sms-key-5678", senderId: "LNSFLW" }
  };

  test("an admin can save integration credentials via the dedicated endpoint and read them back", async () => {
    const token = await loginAs("admin@lensflow.local");
    const putResponse = await fetch(`${BASE_URL}/api/admin-actions/integration-configs`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ integrationConfigs: VALID_CONFIGS })
    });
    expect(putResponse.status).toBe(200);

    const after = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    expect(after.integrationConfigs.gmail).toEqual(VALID_CONFIGS.gmail);
    expect(after.integrationConfigs.sms.senderId).toBe("LNSFLW");
  });

  test("rejects a payload missing one of the required channel objects", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/integration-configs`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ integrationConfigs: { gmail: VALID_CONFIGS.gmail } })
    });
    expect(response.status).toBe(400);
  });

  test("a customer token cannot write integration configs", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/integration-configs`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ integrationConfigs: VALID_CONFIGS })
    });
    expect(response.status).toBe(403);
  });

  test("the generic PUT /api/state sync can never change integrationConfigs, even if an admin sends one", async () => {
    const token = await loginAs("admin@lensflow.local");
    await fetch(`${BASE_URL}/api/admin-actions/integration-configs`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ integrationConfigs: VALID_CONFIGS })
    });

    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    const tampered = {
      ...current,
      integrationConfigs: {
        gmail: { enabled: true, emailAddress: "attacker@evil.example", appPassword: "hijacked", senderName: "x" },
        whatsapp: { enabled: false, businessPhoneNumberId: "", accessToken: "", fromPhoneNumber: "" },
        sms: { enabled: false, provider: "", apiKey: "", senderId: "" }
      }
    };
    const putResponse = await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({ state: tampered }) });
    expect(putResponse.status).toBe(200);

    const after = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    expect(after.integrationConfigs.gmail.emailAddress).toBe("orders@lensflow.local");
  });
});

describe("PUT /api/state (admin-only)", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { customers: [] } })
    });
    expect(response.status).toBe(401);
  });

  test("rejects a customer token", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/state`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ state: { customers: [] } })
    });
    expect(response.status).toBe(403);
  });

  test("rejects a state object with no state key", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({}) });
    expect(response.status).toBe(400);
  });

  test("rejects a state object where a known field has the wrong type", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/state`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ state: { customers: "not-an-array" } })
    });
    expect(response.status).toBe(400);
  });

  test("persists an admin's full state sync", async () => {
    const token = await loginAs("admin@lensflow.local");
    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    const withNewBrand = { ...current, brands: [...current.brands, { id: "b-new", name: "New Brand", active: true }] };
    const putResponse = await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({ state: withNewBrand }) });
    expect(putResponse.status).toBe(200);

    const after = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    expect(after.brands.some((b) => b.id === "b-new")).toBe(true);
  });

  test("reconciles passwordHash server-side so an admin sync (which never carries it) cannot wipe existing logins", async () => {
    const token = await loginAs("admin@lensflow.local");
    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    // Simulate exactly what the browser does: PUT back state fetched from GET,
    // which never includes passwordHash.
    const putResponse = await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(token), body: JSON.stringify({ state: current }) });
    expect(putResponse.status).toBe(200);

    const stillWorks = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dealer@lensflow.local", password: "dealer123" })
    });
    expect(stillWorks.status).toBe(200);
  });
});

describe("POST /api/customer-actions/orders", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: [] })
    });
    expect(response.status).toBe(401);
  });

  test("rejects an admin token (customers only)", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p1", variantId: "v1", quantity: 6 }] })
    });
    expect(response.status).toBe(403);
  });

  test("rejects a quantity below the variant's minimum order quantity", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p1", variantId: "v1", quantity: 1, power: -2.00 }] })
    });
    expect(response.status).toBe(400);
  });

  test("rejects a power value that is not on the product's configured step grid", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p1", variantId: "v1", quantity: 6, power: -2.10 }] })
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("not a valid option");
  });

  test("resolves a different price above/below the power threshold for a tiered-pricing product", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const below = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p4", variantId: "v6", quantity: 2, power: -8.00 }] })
    });
    const belowBody = await below.json();
    expect(below.status).toBe(201);
    expect(belowBody.order.lineItems[0].unitPrice).toBe(650);

    const above = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p4", variantId: "v6", quantity: 2, power: -11.00 }] })
    });
    const aboveBody = await above.json();
    expect(above.status).toBe(201);
    expect(aboveBody.order.lineItems[0].unitPrice).toBe(800);
  });

  test("ignores a client-supplied price and resolves it from the server-side catalog", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        cart: [{ productId: "p1", variantId: "v1", quantity: 6, unitPrice: 1, power: -2.00 }]
      })
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    // p1/v1 dealer price is 245 in the seed catalog, not the tampered 1.
    expect(body.order.lineItems[0].unitPrice).toBe(245);
    expect(body.order.customerId).toBeTruthy();
  });

  test("a submitted order appears in the shared state", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const orderResponse = await fetch(`${BASE_URL}/api/customer-actions/orders`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ cart: [{ productId: "p1", variantId: "v1", quantity: 6, power: -2.00 }] })
    });
    const { order } = await orderResponse.json();

    const adminToken = await loginAs("admin@lensflow.local");
    const state = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    expect(state.orders.some((o) => o.id === order.id)).toBe(true);
  });
});

describe("PATCH /api/customer-actions/notification-preferences", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/customer-actions/notification-preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationPreferences: { email: false, sms: false, whatsapp: false } })
    });
    expect(response.status).toBe(401);
  });

  test("updates only the caller's own notification preferences", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/customer-actions/notification-preferences`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ notificationPreferences: { email: false, sms: true, whatsapp: false } })
    });
    expect(response.status).toBe(200);

    const adminToken = await loginAs("admin@lensflow.local");
    const state = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    const dealer = state.customers.find((c) => c.email === "dealer@lensflow.local");
    expect(dealer.notificationPreferences).toEqual({ email: false, sms: true, whatsapp: false });
  });
});

describe("POST /api/admin-actions/admin-users", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "newstaff@lensflow.local", password: "TestPassword1" })
    });
    expect(response.status).toBe(401);
  });

  test("rejects a customer token", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Test", email: "newstaff@lensflow.local", password: "TestPassword1" })
    });
    expect(response.status).toBe(403);
  });

  test("rejects a password shorter than 8 characters", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Test", email: "newstaff@lensflow.local", password: "short" })
    });
    expect(response.status).toBe(400);
  });

  test("rejects an email that already exists", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "Test", email: "dealer@lensflow.local", password: "TestPassword1" })
    });
    expect(response.status).toBe(409);
  });

  test("creates a real, immediately-usable Admin User account", async () => {
    const token = await loginAs("admin@lensflow.local");
    const createResponse = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ name: "New Staffer", email: "newstaff@lensflow.local", password: "NewStaffPass1" })
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()).adminUser;
    expect(created).toMatchObject({ name: "New Staffer", email: "newstaff@lensflow.local", role: "Admin User" });
    expect(created.passwordHash).toBeUndefined();

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "newstaff@lensflow.local", password: "NewStaffPass1" })
    });
    expect(loginResponse.status).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.user.role).toBe("admin");
  });
});

describe("PATCH /api/admin-actions/admin-users/:id/password", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/a2/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "BrandNewPass1" })
    });
    expect(response.status).toBe(401);
  });

  test("rejects a customer token", async () => {
    const token = await loginAs("dealer@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/a2/password`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ password: "BrandNewPass1" })
    });
    expect(response.status).toBe(403);
  });

  test("rejects a password shorter than 8 characters", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/a2/password`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ password: "short" })
    });
    expect(response.status).toBe(400);
  });

  test("404s for an unknown admin user id", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/does-not-exist/password`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ password: "BrandNewPass1" })
    });
    expect(response.status).toBe(404);
  });

  test("refuses to reset the Super Admin's own password", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/a1/password`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ password: "BrandNewPass1" })
    });
    expect(response.status).toBe(403);
  });

  test("resets Operations Staff's (Admin User role) password, and the new password works for login", async () => {
    const token = await loginAs("admin@lensflow.local");
    const response = await fetch(`${BASE_URL}/api/admin-actions/admin-users/a2/password`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ password: "OpsBrandNewPass1" })
    });
    expect(response.status).toBe(200);

    const oldLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ops@lensflow.local", password: "ops123" })
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ops@lensflow.local", password: "OpsBrandNewPass1" })
    });
    expect(newLogin.status).toBe(200);
  });
});

describe("POST /api/reset-seed (admin-only)", () => {
  test("rejects requests with no token", async () => {
    const response = await fetch(`${BASE_URL}/api/reset-seed`, { method: "POST" });
    expect(response.status).toBe(401);
  });

  test("restores the seeded demo data for an admin token", async () => {
    const token = await loginAs("admin@lensflow.local");
    await fetch(`${BASE_URL}/api/customer-actions/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Temp Co", contactPerson: "Temp", phone: "+91 90000 00001", email: "temp@example.com",
        password: "TempPassword1", gstin: "29TEMPG1234H1Z1", line1: "1 Temp Lane", city: "Pune", state: "Maharashtra", pincode: "411001"
      })
    });
    const resetResponse = await fetch(`${BASE_URL}/api/reset-seed`, { method: "POST", headers: authHeaders(token) });
    expect(resetResponse.status).toBe(200);

    const state = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(token) })).json();
    expect(state.customers.some((c) => c.email === "temp@example.com")).toBe(false);
    expect(state.adminUsers.some((u) => u.email === "admin@lensflow.local")).toBe(true);
  });
});

describe("rate limiting on mutating endpoints", () => {
  const RATE_LIMIT_PORT = PORT + 1;
  const RATE_LIMIT_BASE_URL = `http://localhost:${RATE_LIMIT_PORT}`;
  let rateLimitedServer;
  let rateLimitedAdminToken;

  beforeAll(async () => {
    await dropExistingState(`${MONGODB_URI}_ratelimit`);
    rateLimitedServer = spawn(process.execPath, [resolve(root, "server/index.js")], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(RATE_LIMIT_PORT),
        MONGODB_URI: `${MONGODB_URI}_ratelimit`,
        CORS_ORIGINS: "http://allowed-origin.example",
        ALLOW_SEED_RESET: "true",
        JWT_SECRET,
        STATE_RATE_LIMIT_MAX: "3",
        LOGIN_RATE_LIMIT_MAX: "1000"
      },
      stdio: "pipe"
    });
    await waitForHealth(RATE_LIMIT_BASE_URL);
    const loginResponse = await fetch(`${RATE_LIMIT_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lensflow.local", password: "admin123" })
    });
    rateLimitedAdminToken = (await loginResponse.json()).token;
  });

  afterAll(() => {
    rateLimitedServer?.kill();
  });

  test("returns 429 once the configured write limit is exceeded", async () => {
    const responses = [];
    for (let i = 0; i < 5; i += 1) {
      responses.push(await fetch(`${RATE_LIMIT_BASE_URL}/api/reset-seed`, {
        method: "POST",
        headers: authHeaders(rateLimitedAdminToken)
      }));
    }
    const statuses = responses.map((r) => r.status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});

describe("rate limiting on GET /api/state", () => {
  const READ_LIMIT_PORT = PORT + 2;
  const READ_LIMIT_BASE_URL = `http://localhost:${READ_LIMIT_PORT}`;
  let readLimitedServer;
  let readLimitedAdminToken;

  beforeAll(async () => {
    await dropExistingState(`${MONGODB_URI}_readlimit`);
    readLimitedServer = spawn(process.execPath, [resolve(root, "server/index.js")], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(READ_LIMIT_PORT),
        MONGODB_URI: `${MONGODB_URI}_readlimit`,
        CORS_ORIGINS: "http://allowed-origin.example",
        ALLOW_SEED_RESET: "true",
        JWT_SECRET,
        STATE_RATE_LIMIT_MAX: "1000",
        LOGIN_RATE_LIMIT_MAX: "1000",
        STATE_READ_RATE_LIMIT_MAX: "3"
      },
      stdio: "pipe"
    });
    await waitForHealth(READ_LIMIT_BASE_URL);
    const loginResponse = await fetch(`${READ_LIMIT_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@lensflow.local", password: "admin123" })
    });
    readLimitedAdminToken = (await loginResponse.json()).token;
  });

  afterAll(() => {
    readLimitedServer?.kill();
  });

  test("returns 429 once the configured read limit is exceeded", async () => {
    const responses = [];
    for (let i = 0; i < 5; i += 1) {
      responses.push(await fetch(`${READ_LIMIT_BASE_URL}/api/state`, { headers: authHeaders(readLimitedAdminToken) }));
    }
    const statuses = responses.map((r) => r.status);
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});

describe("per-account login lockout", () => {
  const LOCKOUT_PORT = PORT + 3;
  const LOCKOUT_BASE_URL = `http://localhost:${LOCKOUT_PORT}`;
  let lockoutServer;

  beforeAll(async () => {
    await dropExistingState(`${MONGODB_URI}_lockout`);
    lockoutServer = spawn(process.execPath, [resolve(root, "server/index.js")], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(LOCKOUT_PORT),
        MONGODB_URI: `${MONGODB_URI}_lockout`,
        CORS_ORIGINS: "http://allowed-origin.example",
        ALLOW_SEED_RESET: "true",
        JWT_SECRET,
        LOGIN_RATE_LIMIT_MAX: "1000",
        ACCOUNT_LOCKOUT_MAX_ATTEMPTS: "3"
      },
      stdio: "pipe"
    });
    await waitForHealth(LOCKOUT_BASE_URL);
  });

  afterAll(() => {
    lockoutServer?.kill();
  });

  async function attemptLogin(email, password) {
    return fetch(`${LOCKOUT_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  }

  test("locks out further attempts for that email after repeated failures, independent of IP-based rate limiting", async () => {
    for (let i = 0; i < 3; i += 1) {
      const response = await attemptLogin("dealer@lensflow.local", "wrong-password");
      expect(response.status).toBe(401);
    }
    const lockedOut = await attemptLogin("dealer@lensflow.local", "wrong-password");
    expect(lockedOut.status).toBe(429);

    // Even the CORRECT password is refused while locked out.
    const correctButLocked = await attemptLogin("dealer@lensflow.local", "dealer123");
    expect(correctButLocked.status).toBe(429);
  });

  test("a successful login clears the failure count for that email", async () => {
    for (let i = 0; i < 2; i += 1) {
      await attemptLogin("retailer@lensflow.local", "wrong-password");
    }
    const success = await attemptLogin("retailer@lensflow.local", "retailer123");
    expect(success.status).toBe(200);

    // Two more failures after the reset shouldn't trip the (3-attempt) lockout yet.
    const afterReset = await attemptLogin("retailer@lensflow.local", "wrong-password");
    expect(afterReset.status).toBe(401);
  });
});

describe("account re-validation on already-issued tokens", () => {
  test("a suspended customer's existing token is rejected by GET /api/state, not just by login", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    const adminToken = await loginAs("admin@lensflow.local");

    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    const suspended = { ...current, customers: current.customers.map((c) => (c.email === "dealer@lensflow.local" ? { ...c, status: "Suspended" } : c)) };
    await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(adminToken), body: JSON.stringify({ state: suspended }) });

    const response = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(dealerToken) });
    expect(response.status).toBe(401);
  });

  test("a suspended customer's existing token is rejected by notification-preferences too", async () => {
    const dealerToken = await loginAs("dealer@lensflow.local");
    const adminToken = await loginAs("admin@lensflow.local");

    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(adminToken) })).json();
    const suspended = { ...current, customers: current.customers.map((c) => (c.email === "dealer@lensflow.local" ? { ...c, status: "Suspended" } : c)) };
    await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(adminToken), body: JSON.stringify({ state: suspended }) });

    const response = await fetch(`${BASE_URL}/api/customer-actions/notification-preferences`, {
      method: "PATCH",
      headers: authHeaders(dealerToken),
      body: JSON.stringify({ notificationPreferences: { email: false, sms: false, whatsapp: false } })
    });
    expect(response.status).toBe(401);
  });

  test("a removed admin's existing token is rejected, even for the generic state sync", async () => {
    const superAdminToken = await loginAs("admin@lensflow.local");
    const createResponse = await fetch(`${BASE_URL}/api/admin-actions/admin-users`, {
      method: "POST",
      headers: authHeaders(superAdminToken),
      body: JSON.stringify({ name: "Soon Removed", email: "soon-removed@lensflow.local", password: "SoonRemoved1" })
    });
    expect(createResponse.status).toBe(201);
    const newAdminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "soon-removed@lensflow.local", password: "SoonRemoved1" })
    });
    const removedAdminToken = (await newAdminLogin.json()).token;

    const current = await (await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(superAdminToken) })).json();
    const withoutNewAdmin = { ...current, adminUsers: current.adminUsers.filter((u) => u.email !== "soon-removed@lensflow.local") };
    await fetch(`${BASE_URL}/api/state`, { method: "PUT", headers: authHeaders(superAdminToken), body: JSON.stringify({ state: withoutNewAdmin }) });

    const stateResponse = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders(removedAdminToken) });
    expect(stateResponse.status).toBe(401);

    const syncResponse = await fetch(`${BASE_URL}/api/state`, {
      method: "PUT",
      headers: authHeaders(removedAdminToken),
      body: JSON.stringify({ state: current })
    });
    expect(syncResponse.status).toBe(401);
  });
});

describe("CORS", () => {
  test("allows a request with no Origin header (server-to-server / curl)", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.status).toBe(200);
  });

  test("rejects a browser Origin that is not in CORS_ORIGINS", async () => {
    const response = await fetch(`${BASE_URL}/health`, { headers: { Origin: "https://not-allowed.example" } });
    expect(response.headers.get("access-control-allow-origin")).not.toBe("https://not-allowed.example");
  });

  test("allows an Origin that is explicitly listed in CORS_ORIGINS", async () => {
    const response = await fetch(`${BASE_URL}/health`, { headers: { Origin: "http://allowed-origin.example" } });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://allowed-origin.example");
  });
});
