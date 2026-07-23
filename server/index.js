import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";
import { seedState } from "./seed-data.js";
import {
  authenticate,
  hashPassword,
  requireAdmin,
  signToken,
  unusablePasswordHash,
  verifyAgainstDummyHash,
  verifyPassword
} from "./auth.js";
import { isValueInRanges, resolveMinOrderQty, resolveUnitPrice } from "./catalog.js";
import { clearFailedLogins, isAccountLocked, recordFailedLogin } from "./login-lockout.js";

const app = express();
const port = Number(process.env.PORT || 8080);
const corsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin(origin, callback) {
    // No Origin header means a non-browser/server-to-server request (curl, health
    // checks) - always allow those. A browser Origin is only allowed if it is
    // explicitly listed; an empty CORS_ORIGINS fails closed instead of allowing
    // every origin.
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGINS.`));
  }
}));

const stateWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.STATE_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false
});

const stateReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.STATE_READ_RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false
});

const appStateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, default: "primary" },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    revision: { type: String, required: true, default: () => nanoid() }
  },
  { timestamps: true, minimize: false }
);

const AppState = mongoose.model("AppState", appStateSchema);

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Use a MongoDB Atlas connection string.");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to sign and verify authentication tokens.");
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
}

function cleanState(input) {
  const state = JSON.parse(JSON.stringify(input || {}));
  state.session = null;
  state.view = "login";
  state.activeOrderId = null;
  state.activeCustomerId = null;
  state.selectedProductId = null;
  state.editingProductId = null;
  state.addingAdminUser = false;
  state.resettingPasswordForAdminId = null;
  state.cart = [];
  return state;
}

// The generic admin state sync round-trips whatever the admin's browser last
// fetched, which never includes passwordHash (see sanitizeStateForClient). If
// we trusted the incoming value we'd wipe every password on the first admin
// action after login. Existing accounts keep their real stored hash; accounts
// with no prior stored hash (freshly added via the same generic sync, e.g.
// "Add admin user") get an unusable one rather than trusting client input or
// leaving them unset, since neither a blank password nor an admin-supplied
// hash should ever grant a working login.
function reconcilePasswordHashes(existingList, incomingList) {
  const existingHashById = new Map((existingList || []).map((entry) => [entry.id, entry.passwordHash]));
  return (incomingList || []).map((entry) => {
    const existingHash = existingHashById.get(entry.id);
    const { passwordHash: _ignoredClientValue, ...rest } = entry;
    return { ...rest, passwordHash: existingHash || unusablePasswordHash() };
  });
}

// Strips the pricing tier that doesn't apply to this customer type - a
// retailer has no legitimate reason to see dealer (wholesale) pricing and
// vice versa.
function stripOtherTierPricing(product, customerType) {
  if (!product.pricing) return product;
  const dropField = customerType === "dealer" ? "priceRetailer" : "priceDealer";
  const stripPrice = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const { [dropField]: _dropped, ...rest } = entry;
    return rest;
  };
  const pricing = { ...product.pricing };
  if (pricing.flat) pricing.flat = stripPrice(pricing.flat);
  if (pricing.tiers) pricing.tiers = pricing.tiers.map(stripPrice);
  return { ...product, pricing };
}

function sanitizeStateForClient(state, user) {
  const next = JSON.parse(JSON.stringify(state));
  next.customers = (next.customers || []).map(({ passwordHash: _hash, ...rest }) => rest);
  next.adminUsers = (next.adminUsers || []).map(({ passwordHash: _hash, ...rest }) => rest);

  if (user.role !== "admin") {
    // integrationConfigs holds third-party credentials (Gmail app password,
    // WhatsApp access token, SMS gateway API key) - admin-only.
    delete next.integrationConfigs;
    // The rest of this shared document is other businesses' confidential
    // data (GSTIN, contacts, order history, wholesale pricing) - a customer
    // session must only ever see its own record, its own orders, and its
    // own pricing tier, never the full shared state.
    next.adminUsers = [];
    next.notificationSettings = [];
    next.customers = next.customers.filter((customer) => customer.id === user.customerId);
    next.orders = (next.orders || []).filter((order) => order.customerId === user.customerId);
    next.products = (next.products || []).map((product) => stripOtherTierPricing(product, user.customerType));
  }
  return next;
}

// Re-checked on every authenticated request, not just at login: a token
// stays cryptographically valid for its full 12h lifetime regardless of what
// happens to the underlying account afterwards, so removing an admin or
// suspending a customer must be enforced here too, not just at the point
// where a *new* token would be issued.
function checkAccountStillActive(doc, user) {
  if (user.role === "admin") {
    const stillExists = (doc.state.adminUsers || []).some((admin) => admin.id === user.id);
    return stillExists ? null : "This admin account no longer exists. Please sign in again.";
  }
  const customer = (doc.state.customers || []).find((c) => c.id === user.customerId);
  if (!customer || customer.status !== "Approved" || !customer.type) {
    return "This account is no longer approved for access. Please sign in again.";
  }
  return null;
}

async function getStateDocument() {
  const existing = await AppState.findOne({ key: "primary" }).lean();
  if (existing) return existing;
  const created = await AppState.create({ key: "primary", state: cleanState(seedState) });
  return created.toObject();
}

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "lensflow-oms-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting"
  });
});

app.post("/api/auth/login", loginLimiter, async (request, response, next) => {
  try {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    if (!email || !password) {
      response.status(400).json({ error: "Email and password are required." });
      return;
    }

    if (isAccountLocked(email)) {
      response.status(429).json({ error: "Too many failed login attempts for this account. Try again later." });
      return;
    }

    const doc = await getStateDocument();
    const admin = doc.state.adminUsers.find((u) => u.email.toLowerCase() === email);
    // Look up the customer regardless of whether an admin matched, so the
    // "wrong password" bcrypt.compare below always runs against a real hash
    // when either kind of account exists - only a truly unknown email falls
    // through to the dummy-hash path.
    const customer = !admin ? doc.state.customers.find((c) => c.email.toLowerCase() === email) : null;

    // Deliberately the exact same status/message as a wrong password, and a
    // real bcrypt.compare against a fixed dummy hash rather than an instant
    // return - both the message and the response time would otherwise reveal
    // whether this email has an account at all.
    if (!admin && !customer) {
      await verifyAgainstDummyHash(password);
      recordFailedLogin(email);
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    if (admin) {
      if (!(await verifyPassword(password, admin.passwordHash))) {
        recordFailedLogin(email);
        response.status(401).json({ error: "Invalid email or password." });
        return;
      }
      clearFailedLogins(email);
      const token = signToken({ role: "admin", id: admin.id, email: admin.email, name: admin.name });
      response.json({ token, user: { role: "admin", id: admin.id, email: admin.email, name: admin.name } });
      return;
    }

    if (!(await verifyPassword(password, customer.passwordHash))) {
      recordFailedLogin(email);
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }
    clearFailedLogins(email);
    if (customer.status !== "Approved") {
      response.status(403).json({ error: `This account is ${customer.status}. Admin approval is required before login.` });
      return;
    }
    if (!customer.type) {
      response.status(403).json({ error: "This account has not been assigned as a dealer or retailer yet." });
      return;
    }
    const token = signToken({
      role: "customer",
      id: customer.id,
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      customerType: customer.type
    });
    response.json({
      token,
      user: { role: "customer", id: customer.id, customerId: customer.id, email: customer.email, name: customer.name, customerType: customer.type }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/customer-actions/register", loginLimiter, async (request, response, next) => {
  try {
    const body = request.body || {};
    const required = ["name", "contactPerson", "phone", "email", "gstin", "line1", "city", "state", "pincode", "password"];
    if (required.some((field) => !String(body[field] || "").trim())) {
      response.status(400).json({ error: "All registration fields are required." });
      return;
    }
    if (String(body.password).length < 8) {
      response.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    const email = String(body.email).trim().toLowerCase();
    const doc = await getStateDocument();
    const emailTaken = doc.state.customers.some((c) => c.email.toLowerCase() === email) ||
      doc.state.adminUsers.some((u) => u.email.toLowerCase() === email);
    if (emailTaken) {
      response.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    const address = {
      line1: String(body.line1).trim(),
      line2: String(body.line2 || "").trim(),
      city: String(body.city).trim(),
      state: String(body.state).trim(),
      pincode: String(body.pincode).trim()
    };
    const newCustomer = {
      id: "c" + nanoid(),
      type: "",
      status: "PendingApproval",
      name: String(body.name).trim(),
      contactPerson: String(body.contactPerson).trim(),
      phone: String(body.phone).trim(),
      email,
      passwordHash: await hashPassword(String(body.password)),
      gstin: String(body.gstin).trim(),
      billingAddress: address,
      shippingAddress: { ...address },
      notificationPreferences: { email: true, sms: false, whatsapp: true }
    };

    await AppState.findOneAndUpdate(
      { key: "primary" },
      { $push: { "state.customers": newCustomer }, $set: { revision: nanoid() } },
      { new: true, lean: true }
    );
    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/customer-actions/orders", stateWriteLimiter, authenticate, async (request, response, next) => {
  try {
    if (request.user.role !== "customer") {
      response.status(403).json({ error: "Only customer accounts can submit orders." });
      return;
    }
    const cart = Array.isArray(request.body?.cart) ? request.body.cart : null;
    if (!cart || !cart.length) {
      response.status(400).json({ error: "Cart must contain at least one line item." });
      return;
    }

    const doc = await getStateDocument();
    const customer = doc.state.customers.find((c) => c.id === request.user.customerId);
    if (!customer || customer.status !== "Approved" || !customer.type) {
      response.status(403).json({ error: "Account is not approved for ordering." });
      return;
    }

    const lineItems = [];
    for (const line of cart) {
      const product = doc.state.products.find((p) => p.id === line.productId && p.active);
      if (!product) {
        response.status(400).json({ error: `Unknown or inactive product: ${line.productId}` });
        return;
      }
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        response.status(400).json({ error: `Unknown variant for product ${product.name}` });
        return;
      }
      const category = doc.state.categories?.find((c) => c.id === product.categoryId);
      const optical = product.opticalParameters;

      // Power/cyl/axis are always re-validated against the product's own
      // defined ranges - a tampered client could otherwise submit an order
      // for a power the product was never configured to sell.
      if (category?.hasOpticalParameters) {
        if (!isValueInRanges(line.power, optical?.powerRanges)) {
          response.status(400).json({ error: `Power ${line.power} is not a valid option for ${product.name}.` });
          return;
        }
        if (category.hasCylAxis) {
          if (optical?.cylPowerRange && !isValueInRanges(line.cyl, [optical.cylPowerRange])) {
            response.status(400).json({ error: `Cyl power ${line.cyl} is not a valid option for ${product.name}.` });
            return;
          }
          if (optical?.axisRange && !isValueInRanges(line.axis, [optical.axisRange])) {
            response.status(400).json({ error: `Axis ${line.axis} is not a valid option for ${product.name}.` });
            return;
          }
        }
      }

      const quantity = Number(line.quantity);
      const minQty = resolveMinOrderQty(product, variant, line.power);
      if (!Number.isFinite(quantity) || quantity < minQty) {
        response.status(400).json({ error: `Minimum order quantity for ${product.name} (${variant.name}) is ${minQty}.` });
        return;
      }

      // Price and GST always come from the current server-side catalog, never
      // from the client - otherwise a tampered local `state.products` could
      // submit an order at an arbitrary price.
      let unitPrice;
      try {
        unitPrice = resolveUnitPrice(product, variant, line.power, customer.type);
      } catch (error) {
        response.status(400).json({ error: `${product.name}: ${error.message}` });
        return;
      }

      lineItems.push({
        lineItemId: "li-" + nanoid(),
        productId: product.id,
        variantId: variant.id,
        brand: doc.state.brands.find((b) => b.id === product.brandId)?.name || "Brand",
        productName: product.name,
        variantName: variant.name,
        specifications: {
          power: category?.hasOpticalParameters ? line.power ?? null : null,
          cyl: category?.hasCylAxis ? line.cyl ?? null : null,
          axis: category?.hasCylAxis ? line.axis ?? null : null
        },
        quantity,
        unitPrice,
        gstRate: product.gstRate,
        lineTotal: quantity * unitPrice
      });
    }

    const subTotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
    const gstAmount = lineItems.reduce((sum, l) => sum + l.lineTotal * ((l.gstRate || 12) / 100), 0);
    const now = new Date().toISOString();
    const order = {
      id: "o" + nanoid(),
      orderNumber: "ORD-2026-" + String(doc.state.orders.length + 124).padStart(6, "0"),
      customerId: customer.id,
      customerType: customer.type,
      status: "Order Received",
      isEdited: false,
      currentVersion: 1,
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress,
      lineItems,
      notes: "",
      createdBy: customer.id,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: "Order Received", changedBy: customer.id, changedAt: now }],
      orderHistory: [],
      invoiceGenerated: false,
      shippingLabelGenerated: false,
      subTotal,
      gstAmount,
      grandTotal: subTotal + gstAmount,
      gstRate: 12
    };

    await AppState.findOneAndUpdate(
      { key: "primary" },
      { $push: { "state.orders": { $each: [order], $position: 0 } }, $set: { revision: nanoid() } },
      { new: true, lean: true }
    );
    response.status(201).json({ ok: true, order });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/customer-actions/notification-preferences", stateWriteLimiter, authenticate, async (request, response, next) => {
  try {
    if (request.user.role !== "customer") {
      response.status(403).json({ error: "Only customer accounts can update notification preferences." });
      return;
    }
    const doc = await getStateDocument();
    const inactiveReason = checkAccountStillActive(doc, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    const prefs = request.body?.notificationPreferences;
    if (!prefs || typeof prefs !== "object") {
      response.status(400).json({ error: "notificationPreferences object is required." });
      return;
    }
    const sanitized = { email: Boolean(prefs.email), sms: Boolean(prefs.sms), whatsapp: Boolean(prefs.whatsapp) };
    const updated = await AppState.findOneAndUpdate(
      { key: "primary", "state.customers.id": request.user.customerId },
      { $set: { "state.customers.$.notificationPreferences": sanitized, revision: nanoid() } },
      { new: true, lean: true }
    );
    if (!updated) {
      response.status(404).json({ error: "Customer not found." });
      return;
    }
    response.json({ ok: true, notificationPreferences: sanitized });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin-actions/admin-users", stateWriteLimiter, requireAdmin, async (request, response, next) => {
  try {
    const body = request.body || {};
    if (!String(body.name || "").trim() || !String(body.email || "").trim() || !body.password) {
      response.status(400).json({ error: "Name, email and password are required." });
      return;
    }
    if (String(body.password).length < 8) {
      response.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    const email = String(body.email).trim().toLowerCase();
    const doc = await getStateDocument();
    const inactiveReason = checkAccountStillActive(doc, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    const emailTaken = doc.state.adminUsers.some((u) => u.email.toLowerCase() === email) ||
      doc.state.customers.some((c) => c.email.toLowerCase() === email);
    if (emailTaken) {
      response.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    const newAdmin = {
      id: "a" + nanoid(),
      name: String(body.name).trim(),
      email,
      role: "Admin User",
      passwordHash: await hashPassword(String(body.password))
    };
    await AppState.findOneAndUpdate(
      { key: "primary" },
      { $push: { "state.adminUsers": newAdmin }, $set: { revision: nanoid() } },
      { new: true, lean: true }
    );
    response.status(201).json({ ok: true, adminUser: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role } });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin-actions/admin-users/:id/password", stateWriteLimiter, requireAdmin, async (request, response, next) => {
  try {
    const password = request.body?.password;
    if (!password || String(password).length < 8) {
      response.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }
    const doc = await getStateDocument();
    const inactiveReason = checkAccountStillActive(doc, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    const target = doc.state.adminUsers.find((u) => u.id === request.params.id);
    if (!target) {
      response.status(404).json({ error: "Admin user not found." });
      return;
    }
    if (target.role === "Super Admin") {
      response.status(403).json({ error: "The Super Admin password cannot be reset from here." });
      return;
    }
    const passwordHash = await hashPassword(String(password));
    await AppState.findOneAndUpdate(
      { key: "primary", "state.adminUsers.id": request.params.id },
      { $set: { "state.adminUsers.$.passwordHash": passwordHash, revision: nanoid() } },
      { new: true, lean: true }
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const INTEGRATION_CHANNELS = ["gmail", "whatsapp", "sms"];

app.put("/api/admin-actions/integration-configs", stateWriteLimiter, requireAdmin, async (request, response, next) => {
  try {
    const configs = request.body?.integrationConfigs;
    if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
      response.status(400).json({ error: "An integrationConfigs object is required." });
      return;
    }
    if (!INTEGRATION_CHANNELS.every((channel) => configs[channel] && typeof configs[channel] === "object")) {
      response.status(400).json({ error: "integrationConfigs must include gmail, whatsapp and sms objects." });
      return;
    }
    const doc = await getStateDocument();
    const inactiveReason = checkAccountStillActive(doc, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    await AppState.findOneAndUpdate(
      { key: "primary" },
      { $set: { "state.integrationConfigs": configs, revision: nanoid() } },
      { new: true, lean: true }
    );
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/state", stateReadLimiter, authenticate, async (request, response, next) => {
  try {
    const doc = await getStateDocument();
    const inactiveReason = checkAccountStillActive(doc, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    response.json(sanitizeStateForClient(doc.state, request.user));
  } catch (error) {
    next(error);
  }
});

const STATE_ARRAY_FIELDS = ["adminUsers", "customers", "brands", "categories", "products", "orders", "notificationSettings", "cart"];

function isValidStateShape(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return false;
  return STATE_ARRAY_FIELDS.every((field) => field in state === false || Array.isArray(state[field]));
}

app.put("/api/state", stateWriteLimiter, requireAdmin, async (request, response, next) => {
  try {
    if (!request.body?.state || typeof request.body.state !== "object") {
      response.status(400).json({ error: "A state object is required." });
      return;
    }
    if (!isValidStateShape(request.body.state)) {
      response.status(400).json({ error: "State object has an invalid shape." });
      return;
    }
    const current = await getStateDocument();
    const inactiveReason = checkAccountStillActive(current, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    const nextState = cleanState(request.body.state);
    nextState.customers = reconcilePasswordHashes(current.state.customers, nextState.customers);
    nextState.adminUsers = reconcilePasswordHashes(current.state.adminUsers, nextState.adminUsers);
    // integrationConfigs has its own dedicated endpoint (PUT
    // /api/admin-actions/integration-configs) so these third-party
    // credentials aren't retransmitted on every unrelated admin action -
    // the generic sync can never change them, whatever the client sends.
    nextState.integrationConfigs = current.state.integrationConfigs;
    const doc = await AppState.findOneAndUpdate(
      { key: "primary" },
      { $set: { state: nextState, revision: nanoid() } },
      { upsert: true, new: true, lean: true }
    );
    response.json({ ok: true, revision: doc.revision, updatedAt: doc.updatedAt });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reset-seed", stateWriteLimiter, requireAdmin, async (request, response, next) => {
  try {
    if (process.env.ALLOW_SEED_RESET !== "true") {
      response.status(403).json({ error: "Seed reset is disabled." });
      return;
    }
    const current = await getStateDocument();
    const inactiveReason = checkAccountStillActive(current, request.user);
    if (inactiveReason) {
      response.status(401).json({ error: inactiveReason });
      return;
    }
    const doc = await AppState.findOneAndUpdate(
      { key: "primary" },
      { $set: { state: cleanState(seedState), revision: nanoid() } },
      { upsert: true, new: true, lean: true }
    );
    response.json({ ok: true, revision: doc.revision });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`LensFlow OMS API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start API server.", error);
    process.exit(1);
  });
