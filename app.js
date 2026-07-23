const STORAGE_KEY = "oms-demo-state-v1";
const TOKEN_STORAGE_KEY = "oms-auth-token-v1";
const USER_STORAGE_KEY = "oms-auth-user-v1";
const CONFIG = window.__OMS_CONFIG__ || {};
const API_BASE_URL = String(CONFIG.apiBaseUrl || "").replace(/\/$/, "");
const DEMO_PASSWORDS = {
  "admin@lensflow.local": "admin123",
  "dealer@lensflow.local": "dealer123",
  "retailer@lensflow.local": "retailer123"
};

let authToken = null;

const STATUSES = [
  "Order Received",
  "Awaiting Payment",
  "Payment Received",
  "Order Processed",
  "Order Dispatched",
  "Order Delivered",
  "Closed",
  "Cancelled"
];

const statusTone = {
  "Order Received": "warn",
  "Awaiting Payment": "warn",
  "Payment Received": "ok",
  "Order Processed": "ok",
  "Order Dispatched": "ok",
  "Order Delivered": "ok",
  Closed: "ok",
  Cancelled: "bad",
  PendingApproval: "warn",
  Approved: "ok",
  Rejected: "bad",
  Suspended: "bad"
};

const seed = {
  session: null,
  view: "login",
  activeOrderId: null,
  activeCustomerId: null,
  selectedProductId: null,
  editingProductId: null,
  addingAdminUser: false,
  resettingPasswordForAdminId: null,
  cart: [],
  adminUsers: [
    { id: "a1", name: "Super Admin", email: "admin@lensflow.local", role: "Super Admin" },
    { id: "a2", name: "Operations Staff", email: "ops@lensflow.local", role: "Admin User" }
  ],
  customers: [
    {
      id: "c1",
      type: "dealer",
      status: "Approved",
      name: "ClearSight Distributors",
      contactPerson: "Anika Mehta",
      phone: "+91 98765 21045",
      email: "dealer@lensflow.local",
      gstin: "27AABCC1234Q1Z5",
      billingAddress: { line1: "12 Market Road", line2: "Unit 4", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      shippingAddress: { line1: "12 Market Road", line2: "Unit 4", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
      notificationPreferences: { email: true, sms: false, whatsapp: true }
    },
    {
      id: "c2",
      type: "retailer",
      status: "Approved",
      name: "Vision Corner",
      contactPerson: "Rahul Shah",
      phone: "+91 99887 77665",
      email: "retailer@lensflow.local",
      gstin: "24AAACV9988M1Z7",
      billingAddress: { line1: "88 High Street", line2: "Shop 9", city: "Ahmedabad", state: "Gujarat", pincode: "380015" },
      shippingAddress: { line1: "88 High Street", line2: "Shop 9", city: "Ahmedabad", state: "Gujarat", pincode: "380015" },
      notificationPreferences: { email: true, sms: true, whatsapp: false }
    },
    {
      id: "c3",
      type: "",
      status: "PendingApproval",
      name: "North Optics Hub",
      contactPerson: "Meera Kapoor",
      phone: "+91 90909 10101",
      email: "north@example.com",
      gstin: "07NORTH1234P1Z9",
      billingAddress: { line1: "Plot 18", line2: "Industrial Area", city: "Delhi", state: "Delhi", pincode: "110020" },
      shippingAddress: { line1: "Plot 18", line2: "Industrial Area", city: "Delhi", state: "Delhi", pincode: "110020" },
      notificationPreferences: { email: true, sms: false, whatsapp: true }
    }
  ],
  brands: [
    { id: "b1", name: "Aura NetraLens", active: true }
  ],
  categories: [
    { id: "cat-optical-sphere", name: "Optical Lens - Sphere Power", hasOpticalParameters: true, hasCylAxis: false },
    { id: "cat-optical-toric", name: "Optical Lens - Toric (Sphere + Cyl + Axis)", hasOpticalParameters: true, hasCylAxis: true },
    { id: "cat-plano", name: "Plano / Cosmetic (No Power)", hasOpticalParameters: false, hasCylAxis: false }
  ],
  products: [
    {
      id: "p1",
      categoryId: "cat-optical-sphere",
      brandId: "b1",
      name: "Aura NetraLens Daily Clear",
      sku: "ANL-DAILY-CLEAR",
      description: "Daily disposable hydrogel lenses for clear everyday wear.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      productType: "Daily Disposable",
      replacementSchedule: "Daily",
      material: "Hydrogel",
      waterContent: "58%",
      diameter: "14.2mm",
      baseCurve: "8.6mm",
      manufacturingMethod: "Cast Molded",
      minOrderQty: 6,
      gstRate: 12,
      active: true,
      opticalParameters: {
        edgeThickness: "0.10mm",
        centerThicknessAtMinus3: "0.08mm",
        powerRanges: [
          { start: 0, end: -5.00, step: 0.25 },
          { start: -5.50, end: -10.00, step: 0.50 }
        ],
        cylPowerRange: null,
        axisRange: null
      },
      variantAxisValues: { color: [], packSize: ["30 Lens Pack", "90 Lens Pack"] },
      pricing: { mode: "flat", flat: { mrp: 310, priceDealer: 245, priceRetailer: 310, minOrderQty: 6 }, tiers: [] },
      variants: [
        { id: "v1", name: "30 Lens Pack", sku: "ANLDC-30", color: null, packSize: "30 Lens Pack", minOrderQty: 6, active: true },
        { id: "v2", name: "90 Lens Pack", sku: "ANLDC-90", color: null, packSize: "90 Lens Pack", minOrderQty: 3, active: true }
      ]
    },
    {
      id: "p2",
      categoryId: "cat-plano",
      brandId: "b1",
      name: "Aura NetraLens Color",
      sku: "ANL-COLOR",
      description: "Soft cosmetic lenses with breathable comfort and natural tones.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      productType: "Cosmetic Monthly",
      replacementSchedule: "Monthly",
      material: "Hydrogel",
      waterContent: "55%",
      diameter: "14.0mm",
      baseCurve: "8.7mm",
      manufacturingMethod: "Cast Molded",
      minOrderQty: 4,
      gstRate: 12,
      active: true,
      opticalParameters: null,
      variantAxisValues: { color: ["Blue", "Hazel"], packSize: [] },
      pricing: { mode: "flat", flat: { mrp: 365, priceDealer: 295, priceRetailer: 365, minOrderQty: 4 }, tiers: [] },
      variants: [
        { id: "v3", name: "Blue", sku: "ANLC-BLUE", color: "Blue", packSize: null, minOrderQty: 4, active: true },
        { id: "v4", name: "Hazel", sku: "ANLC-HAZEL", color: "Hazel", packSize: null, minOrderQty: 4, active: true }
      ]
    },
    {
      id: "p3",
      categoryId: "cat-optical-toric",
      brandId: "b1",
      name: "Aura NetraLens Monthly Toric",
      sku: "ANL-MONTHLY-TORIC",
      description: "Monthly toric lens line for repeat B2B ordering.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      productType: "Toric Monthly",
      replacementSchedule: "Monthly",
      material: "Silicone Hydrogel",
      waterContent: "48%",
      diameter: "14.5mm",
      baseCurve: "8.6mm",
      manufacturingMethod: "Lathe Cut",
      minOrderQty: 6,
      gstRate: 12,
      active: true,
      opticalParameters: {
        edgeThickness: "0.12mm",
        centerThicknessAtMinus3: "0.14mm",
        powerRanges: [
          { start: 0, end: -5.00, step: 0.25 },
          { start: -5.50, end: -8.00, step: 0.50 }
        ],
        cylPowerRange: { start: -0.75, end: -2.75, step: 0.50 },
        axisRange: { start: 10, end: 180, step: 10 }
      },
      variantAxisValues: { color: [], packSize: [] },
      pricing: { mode: "flat", flat: { mrp: 640, priceDealer: 520, priceRetailer: 640, minOrderQty: 6 }, tiers: [] },
      variants: [
        { id: "v5", name: "Standard", sku: "ANLMT-STD", color: null, packSize: null, minOrderQty: 6, active: true }
      ]
    },
    {
      id: "p4",
      categoryId: "cat-optical-sphere",
      brandId: "b1",
      name: "Aura NetraLens Precision Monthly",
      sku: "ANL-PRECISION-MONTHLY",
      description: "Extended-range monthly lens with pack- and power-tiered pricing.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      productType: "Extended Range Monthly",
      replacementSchedule: "Monthly",
      material: "Silicone Hydrogel",
      waterContent: "46%",
      diameter: "14.2mm",
      baseCurve: "8.6mm",
      manufacturingMethod: "Cast Molded",
      minOrderQty: 1,
      gstRate: 12,
      active: true,
      opticalParameters: {
        edgeThickness: "0.11mm",
        centerThicknessAtMinus3: "0.09mm",
        powerRanges: [
          { start: -0.50, end: -6.00, step: 0.25 },
          { start: -6.50, end: -12.00, step: 0.50 },
          { start: -13.00, end: -20.00, step: 1.00 },
          { start: 0.50, end: 4.00, step: 0.20 },
          { start: 4.50, end: 8.00, step: 0.50 },
          { start: 9.00, end: 10.00, step: 1.00 }
        ],
        cylPowerRange: null,
        axisRange: null
      },
      variantAxisValues: { color: [], packSize: ["1 Pair Pack", "3 Pair Pack"] },
      pricing: {
        mode: "tiered",
        flat: null,
        tiers: [
          { match: { packSize: "1 Pair Pack", powerGte: -10.00 }, mrp: 900, priceDealer: 650, priceRetailer: 800, minOrderQty: 2 },
          { match: { packSize: "1 Pair Pack", powerLte: -10.50 }, mrp: 1100, priceDealer: 800, priceRetailer: 980, minOrderQty: 2 },
          { match: { packSize: "3 Pair Pack", powerGte: -10.00 }, mrp: 2500, priceDealer: 1800, priceRetailer: 2200, minOrderQty: 1 },
          { match: { packSize: "3 Pair Pack", powerLte: -10.50 }, mrp: 3000, priceDealer: 2200, priceRetailer: 2700, minOrderQty: 1 }
        ]
      },
      variants: [
        { id: "v6", name: "1 Pair Pack", sku: "ANLPM-1PAIR", color: null, packSize: "1 Pair Pack", minOrderQty: 2, active: true },
        { id: "v7", name: "3 Pair Pack", sku: "ANLPM-3PAIR", color: null, packSize: "3 Pair Pack", minOrderQty: 1, active: true }
      ]
    }
  ],
  orders: [
    {
      id: "o1",
      orderNumber: "ORD-2026-000123",
      customerId: "c1",
      customerType: "dealer",
      status: "Payment Received",
      isEdited: true,
      currentVersion: 2,
      notes: "Urgent dispatch requested.",
      lineItems: [
        item("p1", "v1", "Aura NetraLens", "Aura NetraLens Daily Clear", "30 Lens Pack", -2.00, null, null, 12, 245, 12),
        item("p2", "v3", "Aura NetraLens", "Aura NetraLens Color", "Blue", null, null, null, 4, 295, 12)
      ],
      createdAt: "2026-06-27T08:40:00.000Z",
      updatedAt: "2026-06-28T10:15:00.000Z",
      statusHistory: [
        history("Order Received", "c1", "2026-06-27T08:40:00.000Z"),
        history("Awaiting Payment", "a2", "2026-06-27T11:10:00.000Z"),
        history("Payment Received", "a2", "2026-06-28T10:15:00.000Z")
      ],
      orderHistory: [
        { versionNumber: 2, editedBy: "Operations Staff", editedAt: "2026-06-28T09:50:00.000Z", reason: "Customer corrected quantity for color variant.", summary: "Quantity adjusted before payment reconciliation." }
      ],
      invoiceGenerated: false,
      shippingLabelGenerated: false
    }
  ],
  notificationSettings: [
    { event: "Order Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "both" },
    { event: "Payment Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "customer" },
    { event: "Order Dispatched", channelsEnabled: { email: true, sms: true, whatsapp: true }, recipient: "customer" },
    { event: "NewDealerRegistration", channelsEnabled: { email: true, sms: false, whatsapp: false }, recipient: "admin" }
  ],
  integrationConfigs: {
    gmail: { enabled: false, emailAddress: "", appPassword: "", senderName: "" },
    whatsapp: { enabled: false, businessPhoneNumberId: "", accessToken: "", fromPhoneNumber: "" },
    sms: { enabled: false, provider: "", apiKey: "", senderId: "" }
  }
};

seed.orders = seed.orders.map(withTotals);

let state = clone(seed);

function item(productId, variantId, brand, productName, variantName, power, cyl, axis, quantity, unitPrice, gstRate) {
  return {
    lineItemId: "li-" + Math.random().toString(36).slice(2, 9),
    productId,
    variantId,
    brand,
    productName,
    variantName,
    specifications: { power, cyl, axis },
    quantity,
    unitPrice,
    gstRate,
    lineTotal: quantity * unitPrice
  };
}

function history(status, changedBy, changedAt) {
  return { status, changedBy, changedAt };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Power/cyl/axis ranges are stored as segments ({ start, end, step }) since a
// single product's power range can mix signs and step sizes (see catalog
// admin). This expands a segment into concrete selectable values in either
// direction. Mirrors server/catalog.js exactly - keep both in sync.
function expandRangeSegment(segment) {
  const start = Number(segment.start);
  const end = Number(segment.end);
  const step = Math.abs(Number(segment.step)) || 1;
  const values = [];
  if (end >= start) {
    for (let v = start; v <= end + 1e-9; v += step) values.push(roundTo2(v));
  } else {
    for (let v = start; v >= end - 1e-9; v -= step) values.push(roundTo2(v));
  }
  return values;
}

function expandRanges(segments) {
  return (segments || []).flatMap(expandRangeSegment);
}

function roundTo2(value) {
  return Math.round(value * 100) / 100;
}

function formatPowerValue(value) {
  const n = Number(value);
  if (n === 0) return "Plano";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

function isValueInRanges(value, segments) {
  if (!segments || !segments.length) return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  return expandRanges(segments).some((v) => Math.abs(v - n) < 1e-6);
}

function generateVariants(product) {
  const colors = product.variantAxisValues?.color?.length ? product.variantAxisValues.color : [null];
  const packSizes = product.variantAxisValues?.packSize?.length ? product.variantAxisValues.packSize : [null];
  const variants = [];
  for (const packSize of packSizes) {
    for (const color of colors) {
      const nameParts = [packSize, color].filter(Boolean);
      const name = nameParts.length ? nameParts.join(" - ") : "Standard";
      const skuParts = [product.sku, packSize, color].filter(Boolean).map((p) => String(p).replace(/\s+/g, "").toUpperCase());
      variants.push({
        id: "v-" + skuParts.join("-").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6),
        name,
        sku: skuParts.join("-"),
        color: color || null,
        packSize: packSize || null,
        minOrderQty: product.pricing?.flat?.minOrderQty || product.minOrderQty,
        active: true
      });
    }
  }
  return variants;
}

function tierMatches(match, variant, selectedPower) {
  if (match.packSize && match.packSize !== variant.packSize) return false;
  if (match.color && match.color !== variant.color) return false;
  if (match.powerGte !== undefined || match.powerLte !== undefined) {
    const power = Number(selectedPower);
    if (!Number.isFinite(power)) return false;
    if (match.powerGte !== undefined && !(power >= match.powerGte)) return false;
    if (match.powerLte !== undefined && !(power <= match.powerLte)) return false;
  }
  return true;
}

// Client-side mirror of server/catalog.js's resolveUnitPrice, used only for
// the live price preview while browsing/ordering - the server re-resolves
// this authoritatively and never trusts what the client sends.
function resolveUnitPrice(product, variant, selectedPower, customerType) {
  const pricing = product.pricing;
  if (!pricing) throw new Error("Product has no pricing configured.");
  if (pricing.mode === "flat") {
    const flat = pricing.flat;
    if (!flat) throw new Error("Product has no flat price configured.");
    return customerType === "dealer" ? flat.priceDealer : flat.priceRetailer;
  }
  const tier = (pricing.tiers || []).find((t) => tierMatches(t.match, variant, selectedPower));
  if (!tier) throw new Error("No matching price tier for this power/pack combination.");
  return customerType === "dealer" ? tier.priceDealer : tier.priceRetailer;
}

function resolveMinOrderQty(product, variant, selectedPower) {
  const pricing = product.pricing;
  if (pricing?.mode === "tiered") {
    const tier = (pricing.tiers || []).find((t) => tierMatches(t.match, variant, selectedPower));
    if (tier?.minOrderQty) return tier.minOrderQty;
  }
  return variant.minOrderQty || product.minOrderQty;
}

// Mirrors server/catalog.js exactly - keep both in sync. See that file for
// the formula/reference; this is pure client-side math for the Vertex
// Distance Calculator page, no server round-trip needed.
const DEFAULT_VERTEX_DISTANCE_M = 0.012; // 12mm - standard assumption for a typical spectacle frame

function applyVertexDistance(power, vertexDistanceMeters = DEFAULT_VERTEX_DISTANCE_M) {
  const p = Number(power);
  if (!Number.isFinite(p)) throw new Error("Power must be a finite number.");
  if (!(vertexDistanceMeters > 0)) throw new Error("Vertex distance must be a positive number of meters.");
  const denominator = 1 - vertexDistanceMeters * p;
  if (Math.abs(denominator) < 1e-6) throw new Error("Power is too high to vertex-correct at this distance.");
  return p / denominator;
}

function roundToQuarterDiopter(value) {
  return Math.round(value * 4) / 4;
}

function convertSpectacleRxToContactLens(spherePower, cylPower = 0, vertexDistanceMeters = DEFAULT_VERTEX_DISTANCE_M) {
  const sphere = Number(spherePower);
  if (!Number.isFinite(sphere)) throw new Error("Sphere power must be a finite number.");
  const cyl = Number(cylPower ?? 0);
  if (!Number.isFinite(cyl)) throw new Error("Cylinder power must be a finite number.");

  const correctedSphereMeridian = applyVertexDistance(sphere, vertexDistanceMeters);
  if (!cyl) {
    return { sphere: roundToQuarterDiopter(correctedSphereMeridian), cyl: 0 };
  }

  const correctedCylMeridian = applyVertexDistance(sphere + cyl, vertexDistanceMeters);
  return {
    sphere: roundToQuarterDiopter(correctedSphereMeridian),
    cyl: roundToQuarterDiopter(correctedCylMeridian - correctedSphereMeridian)
  };
}

function categoryFor(product) {
  return byId(state.categories, product.categoryId);
}

function sessionFromUser(user) {
  if (user.role === "admin") return { role: "admin", userId: user.id, name: user.name, email: user.email };
  return { role: "customer", customerId: user.customerId, name: user.name, customerType: user.customerType, email: user.email };
}

function defaultViewForRole(role) {
  return role === "admin" ? "dashboard" : "customer-dashboard";
}

function forceLogout(message) {
  authToken = null;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  state = clone(seed);
  render();
  if (message) alert(message);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueRemoteSave();
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body: keep the generic message
    }
    if (response.status === 401 && state.session) {
      forceLogout("Your session has expired. Please sign in again.");
    }
    throw new Error(message);
  }
  return response.json();
}

function queueRemoteSave() {
  // PUT /api/state is admin-only (see server/index.js); customer actions persist
  // through their own dedicated endpoints (register/orders/notification-prefs),
  // so there is nothing for a customer session to sync here.
  if (!API_BASE_URL || state.session?.role !== "admin") return;
  apiRequest("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state: sanitizeStateForPersistence(state) })
  }).catch((error) => console.warn("Unable to sync state to API.", error));
}

function sanitizeStateForPersistence(value) {
  const next = clone(value);
  next.session = null;
  next.view = "login";
  next.activeOrderId = null;
  next.activeCustomerId = null;
  next.selectedProductId = null;
  next.editingProductId = null;
  next.addingAdminUser = false;
  next.resettingPasswordForAdminId = null;
  next.cart = [];
  return next;
}

function money(value) {
  return "Rs " + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function date(value) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function byId(list, id) {
  return list.find((entry) => entry.id === id);
}

function brandName(id) {
  return byId(state.brands, id)?.name || "Brand";
}

function currentCustomer() {
  return state.session?.customerId ? byId(state.customers, state.session.customerId) : null;
}

function setState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function withTotals(order) {
  const lineItems = order.lineItems.map((line) => ({ ...line, lineTotal: line.quantity * line.unitPrice }));
  const subTotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const gstAmount = lineItems.reduce((sum, line) => sum + line.lineTotal * ((line.gstRate || 12) / 100), 0);
  return { ...order, lineItems, subTotal, gstAmount, grandTotal: subTotal + gstAmount, gstRate: 12 };
}

function orderForCustomer() {
  const customer = currentCustomer();
  return customer ? state.orders.filter((order) => order.customerId === customer.id) : [];
}

function appNav() {
  if (!state.session) return "";
  const admin = state.session.role === "admin";
  const items = admin
    ? [
        ["dashboard", "Dashboard"],
        ["orders", "Orders"],
        ["customers", "Dealers & Retailers"],
        ["catalog-admin", "Catalog"],
        ["vertex-calculator", "Vertex Calculator"],
        ["reports", "Reports"],
        ["notifications", "Notifications"],
        ["admin-users", "Admin Users"],
        ["configurations", "Configurations"]
      ]
    : [
        ["customer-dashboard", "Dashboard"],
        ["catalog", "Product Catalog"],
        ["vertex-calculator", "Vertex Calculator"],
        ["cart", `Cart (${state.cart.length})`],
        ["my-orders", "Orders"],
        ["profile", "Profile"]
      ];
  return `
    <aside class="sidebar">
      <div class="brand-lockup">
        <div class="brand-mark"></div>
        <div><strong>LensFlow OMS</strong><span>${admin ? "Admin console" : "Dealer/Retailer portal"}</span></div>
      </div>
      <nav class="nav">
        ${items.map(([view, label]) => `<button class="${state.view === view ? "active" : ""}" onclick="go('${view}')">${label}</button>`).join("")}
      </nav>
      <div class="sidebar-footer">
        <span class="badge">${state.session.name}</span>
        <button class="button secondary" onclick="logout()">Sign out</button>
      </div>
    </aside>`;
}

function shell(content, title, subtitle, actions = "") {
  return `
    <div class="shell">
      ${appNav()}
      <main class="main">
        <div class="topbar">
          <div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>
          <div class="toolbar">${actions}</div>
        </div>
        ${content}
      </main>
    </div>`;
}

function render() {
  const app = document.getElementById("app");
  if (!state.session) {
    app.innerHTML = authPage();
    return;
  }
  const routes = {
    dashboard: adminDashboard,
    orders: adminOrders,
    customers: customersView,
    "catalog-admin": catalogAdmin,
    "vertex-calculator": vertexCalculatorView,
    reports: reportsView,
    notifications: notificationsView,
    "admin-users": adminUsersView,
    configurations: configurationsView,
    "customer-dashboard": customerDashboard,
    catalog: catalogView,
    cart: cartView,
    "my-orders": myOrdersView,
    profile: profileView
  };
  app.innerHTML = (routes[state.view] || routes.dashboard)();
}

function authPage() {
  return `
    <div class="auth-page">
      <section class="auth-visual">
        <div class="brand-lockup"><div class="brand-mark"></div><div><strong>LensFlow OMS</strong><span>B2B contact lens ordering</span></div></div>
        <div>
          <h1>Orders, pricing, approvals, invoices and dispatch in one workspace.</h1>
          <p>Use the demo accounts to enter as Super Admin, Dealer, or Retailer. New registrations start as pending approval, matching the specification.</p>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-panel-inner">
          <div class="tabs">
            <button class="${state.view === "login" ? "active" : ""}" onclick="setState({view:'login'})">Login</button>
            <button class="${state.view === "register" ? "active" : ""}" onclick="setState({view:'register'})">Register</button>
          </div>
          ${state.view === "register" ? registerForm() : loginForm()}
        </div>
      </section>
    </div>`;
}

function loginForm() {
  return `
    <form class="panel grid" onsubmit="loginWithAccount(event)">
      <div class="section-title"><div><h2>Account login</h2><p>The system determines whether the signed-in customer is a dealer or retailer from the account master.</p></div></div>
      <div class="grid two">
        ${field("email", "Email", true, "", "email")}
        ${field("password", "Password", true, "", "password")}
      </div>
      <button class="button">Sign in</button>
      <div class="notice">
        Demo accounts: admin@lensflow.local / admin123, dealer@lensflow.local / dealer123, retailer@lensflow.local / retailer123.
      </div>
      <div class="row-actions">
        <button type="button" class="button secondary" onclick="fillLogin('admin@lensflow.local')">Admin</button>
        <button type="button" class="button secondary" onclick="fillLogin('dealer@lensflow.local')">Dealer account</button>
        <button type="button" class="button secondary" onclick="fillLogin('retailer@lensflow.local')">Retailer account</button>
      </div>
    </form>`;
}

function registerForm() {
  return `
    <form class="panel grid" onsubmit="registerCustomer(event)">
      <div class="section-title"><div><h2>Dealer/Retailer self-registration</h2><p>Registration creates a PendingApproval account for admin review.</p></div></div>
      <div class="grid two">
        ${field("name", "Company name", true)}
        ${field("contactPerson", "Contact person", true)}
        ${field("phone", "Phone", true)}
        ${field("email", "Email", true)}
        ${field("password", "Password", true, "", "password")}
        ${field("gstin", "GSTIN", true)}
        ${field("line1", "Address line 1", true)}
        ${field("line2", "Address line 2", false)}
        ${field("city", "City", true)}
        ${field("state", "State", true)}
        ${field("pincode", "Pincode", true)}
      </div>
      <button class="button">Submit for approval</button>
    </form>`;
}

function field(name, label, required, value = "", type = "text", onInput = "") {
  // step="any" on number inputs - without it the browser defaults to step="1"
  // and rejects any decimal value (e.g. a 0.25 power step) as "invalid".
  return `<div class="field"><label>${escapeHtml(label)}</label><input type="${type}" name="${name}" value="${escapeAttr(value)}" ${type === "number" ? 'step="any"' : ""} ${required ? "required" : ""} ${onInput ? `oninput="${escapeAttr(onInput)}"` : ""}></div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function fillLogin(email) {
  const emailInput = document.querySelector('input[name="email"]');
  const passwordInput = document.querySelector('input[name="password"]');
  if (emailInput) emailInput.value = email;
  if (passwordInput) passwordInput.value = DEMO_PASSWORDS[email] || "";
}

async function loginWithAccount(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  if (!API_BASE_URL) {
    alert("The API is not configured. Authentication requires a running backend.");
    return;
  }
  try {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: data.email, password: data.password })
    });
    authToken = result.token;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
    const remoteState = await apiRequest("/api/state");
    state = { ...clone(seed), ...remoteState, session: sessionFromUser(result.user), view: defaultViewForRole(result.user.role), cart: [] };
    render();
  } catch (error) {
    alert(error.message || "Unable to sign in.");
  }
}

function logout() {
  authToken = null;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  setState({ session: null, view: "login", activeOrderId: null, activeCustomerId: null, selectedProductId: null });
}

function go(view) {
  setState({ view, activeOrderId: null, activeCustomerId: null });
}

async function registerCustomer(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  if (!API_BASE_URL) {
    alert("The API is not configured. Registration requires a running backend.");
    return;
  }
  try {
    await apiRequest("/api/customer-actions/register", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        password: data.password,
        gstin: data.gstin,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode
      })
    });
    alert("Registration submitted. Admin approval is required before login and ordering.");
    setState({ view: "login" });
  } catch (error) {
    alert(error.message || "Unable to submit registration.");
  }
}

function adminDashboard() {
  const openOrders = state.orders.filter((order) => !["Closed", "Cancelled"].includes(order.status));
  const pendingCustomers = state.customers.filter((customer) => customer.status === "PendingApproval");
  const revenue = state.orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + order.grandTotal, 0);
  return shell(`
    <div class="grid four">
      ${metric("Open orders", openOrders.length, "Orders before Closed/Cancelled")}
      ${metric("Pending approvals", pendingCustomers.length, "Dealer/Retailer registrations")}
      ${metric("Revenue booked", money(revenue), "Includes GST")}
      ${metric("Active products", state.products.filter((p) => p.active).length, `Across ${state.brands.length} brands`)}
    </div>
    <div class="grid two" style="margin-top:14px">
      <section class="panel">${pendingOrdersTable()}</section>
      <section class="panel">${approvalQueue()}</section>
    </div>`, "Admin Dashboard", "Monitor orders, approvals, reports and operational alerts.");
}

function metric(label, value, note) {
  return `<div class="panel metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
}

function pendingOrdersTable() {
  const rows = state.orders.filter((order) => !["Closed", "Cancelled"].includes(order.status));
  return `<div class="section-title"><div><h2>Pending orders</h2><p>Grouped by current workflow status.</p></div></div>${ordersTable(rows, true)}`;
}

function approvalQueue() {
  const rows = state.customers.filter((customer) => customer.status === "PendingApproval");
  if (!rows.length) return `<div class="section-title"><h2>Approvals</h2></div><div class="empty">No pending approvals.</div>`;
  return `
    <div class="section-title"><div><h2>Approvals</h2><p>Self-registered customers awaiting review.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Requested by</th><th>Contact</th><th>Action</th></tr></thead><tbody>
    ${rows.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.contactPerson)}</td><td>${escapeHtml(c.email)}<br>${escapeHtml(c.phone)}</td><td><button class="button secondary" onclick="openCustomer('${c.id}')">Open</button></td></tr>`).join("")}
    </tbody></table></div>`;
}

function adminOrders() {
  if (state.activeOrderId) return orderDetail(state.activeOrderId, true);
  return shell(`<section class="panel">${ordersTable(state.orders, true)}</section>`, "Order Management", "Filter, edit, version, invoice, label and move orders through the manual lifecycle.");
}

function ordersTable(rows, admin) {
  if (!rows.length) return `<div class="empty">No orders yet.</div>`;
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Created</th><th>Action</th></tr></thead>
      <tbody>${rows.map((order) => {
        const customer = byId(state.customers, order.customerId);
        return `<tr>
          <td><strong>${escapeHtml(order.orderNumber)}</strong><br>${order.isEdited ? `<span class="badge warn">Edited</span>` : ""}</td>
          <td>${escapeHtml(customer?.name || "Customer")}<br><span class="badge">${escapeHtml(order.customerType)}</span></td>
          <td><span class="badge ${statusTone[order.status] || ""}">${order.status}</span></td>
          <td>${money(order.grandTotal)}</td>
          <td>${date(order.createdAt)}</td>
          <td><button class="button secondary" onclick="openOrder('${order.id}', ${admin})">Open</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

function openOrder(id, admin) {
  setState({ activeOrderId: id, activeCustomerId: null, view: admin ? "orders" : "my-orders" });
}

function orderDetail(orderId, admin) {
  const order = byId(state.orders, orderId);
  const customer = byId(state.customers, order.customerId);
  const title = admin ? "Order Detail" : order.orderNumber;
  const back = admin ? "orders" : "my-orders";
  const controls = admin ? `
    <div class="panel grid">
      <div class="section-title"><div><h3>Admin actions</h3><p>Status changes and edits are admin-only.</p></div></div>
      <div class="grid two">
        <div class="field"><label>Status</label><select id="statusSelect">${STATUSES.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></div>
        <div class="field"><label>Edit reason</label><input id="editReason" placeholder="Reason for order edit"></div>
      </div>
      <div class="row-actions">
        <button class="button" onclick="updateOrderStatus('${order.id}')">Update status</button>
        <button class="button secondary" onclick="adminAdjustOrder('${order.id}')">Increase first quantity</button>
        <button class="button ghost" onclick="printDoc('${order.id}','invoice')">Generate invoice</button>
        <button class="button ghost" onclick="printDoc('${order.id}','label')">Print shipping label</button>
      </div>
    </div>` : "";
  return shell(`
    <div class="split">
      <section class="panel">
        <div class="section-title">
          <div><h2>${escapeHtml(order.orderNumber)} ${order.isEdited ? `<span class="badge warn">Edited</span>` : ""}</h2><p>${escapeHtml(customer.name)} - ${escapeHtml(customer.type)}</p></div>
          <span class="badge ${statusTone[order.status] || ""}">${order.status}</span>
        </div>
        ${lineItemsTable(order)}
        <div class="totals" style="margin-top:14px">
          <div><span>Subtotal</span><strong>${money(order.subTotal)}</strong></div>
          <div><span>GST</span><strong>${money(order.gstAmount)}</strong></div>
          <div><span>Grand total</span><strong>${money(order.grandTotal)}</strong></div>
        </div>
      </section>
      <aside class="grid">
        ${controls}
        <div class="panel"><div class="section-title"><h3>Status history</h3></div><div class="timeline">${order.statusHistory.map((entry) => `<div class="timeline-item"><strong>${escapeHtml(entry.status)}</strong><span>${date(entry.changedAt)}</span></div>`).join("")}</div></div>
        <div class="panel"><div class="section-title"><h3>Version history</h3></div>${order.orderHistory?.length ? `<div class="timeline">${order.orderHistory.map((entry) => `<div class="timeline-item"><strong>Version ${entry.versionNumber}</strong><span>${date(entry.editedAt)} by ${escapeHtml(entry.editedBy)}</span><p>${escapeHtml(entry.reason || entry.summary || "Order edited.")}</p></div>`).join("")}</div>` : `<div class="empty">No edits recorded.</div>`}</div>
      </aside>
    </div>`, title, "Order number, line items, totals, lifecycle and audit history.", `<button class="button secondary" onclick="go('${back}')">Back</button>`);
}

function formatSpecifications(specs) {
  const parts = [];
  if (specs?.power !== null && specs?.power !== undefined && specs?.power !== "") parts.push(`Power ${escapeHtml(formatPowerValue(specs.power))}`);
  if (specs?.cyl !== null && specs?.cyl !== undefined && specs?.cyl !== "") parts.push(`Cyl ${escapeHtml(formatPowerValue(specs.cyl))}`);
  if (specs?.axis !== null && specs?.axis !== undefined && specs?.axis !== "") parts.push(`Axis ${escapeHtml(String(specs.axis))}°`);
  return parts.length ? parts.join("<br>") : "-";
}

function lineItemsTable(order) {
  return `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Variant</th><th>Specifications</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>
    ${order.lineItems.map((line) => `<tr><td>${escapeHtml(line.productName)}<br><span class="badge">${escapeHtml(line.brand)}</span></td><td>${escapeHtml(line.variantName)}</td><td>${formatSpecifications(line.specifications)}</td><td>${line.quantity}</td><td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function updateOrderStatus(orderId) {
  const order = byId(state.orders, orderId);
  const status = document.getElementById("statusSelect").value;
  if (status === order.status) return;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  order.statusHistory.push(history(status, state.session.userId, order.updatedAt));
  saveState();
  render();
}

function adminAdjustOrder(orderId) {
  const order = byId(state.orders, orderId);
  const reason = document.getElementById("editReason")?.value || "Admin edited order line item.";
  order.orderHistory = order.orderHistory || [];
  order.orderHistory.push({
    versionNumber: order.currentVersion + 1,
    editedBy: state.session.name,
    editedAt: new Date().toISOString(),
    reason,
    snapshotBeforeEdit: clone(order)
  });
  order.currentVersion += 1;
  order.isEdited = true;
  order.lineItems[0].quantity += 1;
  Object.assign(order, withTotals(order));
  saveState();
  render();
}

function printDoc(orderId, type) {
  const order = byId(state.orders, orderId);
  const customer = byId(state.customers, order.customerId);
  const isInvoice = type === "invoice";
  const rows = order.lineItems.map((line) => `
    <tr><td>${escapeHtml(line.productName)}</td><td>${escapeHtml(line.variantName)}</td><td>${formatSpecifications(line.specifications)}</td><td>${line.quantity}</td>${isInvoice ? `<td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td>` : ""}</tr>`).join("");
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>${isInvoice ? "Invoice" : "Shipping Label"} ${escapeHtml(order.orderNumber)}</title><link rel="stylesheet" href="./styles.css"></head>
    <body style="padding:28px;background:white">
      <div class="section-title"><div><h1>${isInvoice ? "Invoice" : "Shipping Label"}</h1><p>${escapeHtml(order.orderNumber)} - ${date(order.createdAt)}</p></div><span class="badge">${escapeHtml(order.status)}</span></div>
      <section class="panel" style="box-shadow:none">
        <h3>${isInvoice ? "Billing address" : "Ship to"}</h3>
        <p><strong>${escapeHtml(customer.name)}</strong><br>${escapeHtml(customer.contactPerson)}<br>${isInvoice ? address(customer.billingAddress) : address(customer.shippingAddress)}<br>Phone: ${escapeHtml(customer.phone)}${isInvoice ? `<br>GSTIN: ${escapeHtml(customer.gstin)}` : ""}</p>
        <table><thead><tr><th>Product</th><th>Variant</th><th>Specifications</th><th>Qty</th>${isInvoice ? "<th>Unit</th><th>Total</th>" : ""}</tr></thead><tbody>${rows}</tbody></table>
        ${isInvoice ? `<div class="totals" style="margin-top:18px"><div><span>Subtotal</span><strong>${money(order.subTotal)}</strong></div><div><span>GST</span><strong>${money(order.gstAmount)}</strong></div><div><span>Grand total</span><strong>${money(order.grandTotal)}</strong></div></div>` : ""}
      </section>
      <button class="button no-print" onclick="print()">Print</button>
    </body></html>`);
  win.document.close();
}

function address(addr) {
  return `${escapeHtml(addr.line1)}, ${escapeHtml(addr.line2)}<br>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.pincode)}`;
}

function customersView() {
  if (state.activeCustomerId) return customerReviewDetail(state.activeCustomerId);
  return shell(`
    <section class="panel">
      <div class="section-title">
        <div><h2>Customer master</h2><p>Create-only import behavior is represented by adding new approved sample rows.</p></div>
        <div class="row-actions"><button class="button secondary" onclick="simulateCustomerImport()">Import sample CSV</button><button class="button ghost" onclick="exportCustomers()">Export CSV</button></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Contact</th><th>GSTIN</th><th>Action</th></tr></thead><tbody>
      ${state.customers.map((c) => `<tr><td><strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.contactPerson)}</td><td>${customerTypeLabel(c)}</td><td><span class="badge ${statusTone[c.status] || ""}">${c.status}</span></td><td>${escapeHtml(c.email)}<br>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.gstin)}</td><td class="row-actions"><button class="button secondary" onclick="openCustomer('${c.id}')">Open</button>${customerStatusActionButton(c)}</td></tr>`).join("")}
      </tbody></table></div>
    </section>`, "Dealer & Retailer Management", "Approval queue, master data, import/export and notification preferences.");
}

function openCustomer(id) {
  setState({ activeCustomerId: id, view: "customers", activeOrderId: null });
}

function customerTypeLabel(customer) {
  return customer.type ? escapeHtml(customer.type) : `<span class="badge warn">Not assigned</span>`;
}

function customerReviewDetail(id) {
  const customer = byId(state.customers, id);
  if (!customer) return shell(`<div class="empty">Customer not found.</div>`, "Registration Review", "", `<button class="button secondary" onclick="go('customers')">Back</button>`);
  const isPending = customer.status === "PendingApproval";
  const actions = isPending ? `
    <aside class="panel grid">
      <div class="section-title"><div><h3>Approval decision</h3><p>Assign the account type after verifying registration details.</p></div></div>
      <div class="field">
        <label>Assign type</label>
        <select id="approvalCustomerType">
          <option value="">Select type</option>
          <option value="dealer" ${customer.type === "dealer" ? "selected" : ""}>Dealer</option>
          <option value="retailer" ${customer.type === "retailer" ? "selected" : ""}>Retailer</option>
        </select>
      </div>
      <div class="row-actions">
        <button class="button" onclick="approveCustomerRegistration('${customer.id}')">Approve</button>
        <button class="button bad" onclick="rejectCustomerRegistration('${customer.id}')">Reject</button>
      </div>
    </aside>` : `
    <aside class="panel grid">
      <div class="section-title"><div><h3>Account status</h3><p>This registration has already been reviewed.</p></div></div>
      <span class="badge ${statusTone[customer.status] || ""}">${customer.status}</span>
      <div class="field">
        <label>Assigned type</label>
        <select id="approvalCustomerType">
          <option value="" ${!customer.type ? "selected" : ""}>Not assigned</option>
          <option value="dealer" ${customer.type === "dealer" ? "selected" : ""}>Dealer</option>
          <option value="retailer" ${customer.type === "retailer" ? "selected" : ""}>Retailer</option>
        </select>
      </div>
      <div class="row-actions">
        <button class="button secondary" onclick="updateCustomerType('${customer.id}')">Update type</button>
        ${customerStatusActionButton(customer)}
      </div>
    </aside>`;
  return shell(`
    <div class="split">
      <section class="panel grid">
        <div class="section-title">
          <div><h2>${escapeHtml(customer.name)}</h2><p>${escapeHtml(customer.contactPerson)} - <span class="badge ${statusTone[customer.status] || ""}">${escapeHtml(customer.status)}</span></p></div>
          ${customerTypeLabel(customer)}
        </div>
        <div class="grid two">
          <div><h3>Business details</h3><p><strong>GSTIN:</strong> ${escapeHtml(customer.gstin)}<br><strong>Email:</strong> ${escapeHtml(customer.email)}<br><strong>Phone:</strong> ${escapeHtml(customer.phone)}</p></div>
          <div><h3>Notification preferences</h3><p>Email: ${customer.notificationPreferences?.email ? "Yes" : "No"}<br>SMS: ${customer.notificationPreferences?.sms ? "Yes" : "No"}<br>WhatsApp: ${customer.notificationPreferences?.whatsapp ? "Yes" : "No"}</p></div>
          <div><h3>Billing address</h3><p>${address(customer.billingAddress)}</p></div>
          <div><h3>Shipping address</h3><p>${address(customer.shippingAddress)}</p></div>
        </div>
      </section>
      ${actions}
    </div>`, "Registration Review", "Verify full submitted details before assigning account type and approving.", `<button class="button secondary" onclick="go('customers')">Back</button>`);
}

function approveCustomerRegistration(id) {
  const type = document.getElementById("approvalCustomerType")?.value;
  if (!type) {
    alert("Assign Dealer or Retailer before approving this registration.");
    return;
  }
  const customer = byId(state.customers, id);
  customer.type = type;
  customer.status = "Approved";
  saveState();
  setState({ activeCustomerId: null, view: "customers" });
}

function rejectCustomerRegistration(id) {
  const customer = byId(state.customers, id);
  customer.status = "Rejected";
  saveState();
  setState({ activeCustomerId: null, view: "customers" });
}

function updateCustomerType(id) {
  const type = document.getElementById("approvalCustomerType")?.value;
  if (!type) return;
  byId(state.customers, id).type = type;
  saveState();
  render();
}

function setCustomerStatus(id, status) {
  byId(state.customers, id).status = status;
  saveState();
  render();
}

function customerStatusActionButton(customer) {
  if (customer.status === "Approved") {
    return `<button class="button bad" onclick="setCustomerStatus('${customer.id}','Suspended')">Suspend</button>`;
  }
  if (customer.status === "Suspended") {
    return `<button class="button" onclick="setCustomerStatus('${customer.id}','Approved')">Reactivate</button>`;
  }
  return "";
}

function simulateCustomerImport() {
  const id = "c" + Date.now();
  const addressObj = { line1: "CSV Import Lane", line2: "Suite 2", city: "Pune", state: "Maharashtra", pincode: "411001" };
  state.customers.push({ id, type: "retailer", status: "Approved", name: "Imported Optical Store", contactPerson: "CSV User", phone: "+91 90000 00000", email: `imported${id}@example.com`, gstin: "CSVGSTIN123", billingAddress: addressObj, shippingAddress: clone(addressObj), notificationPreferences: { email: true, sms: false, whatsapp: true } });
  saveState();
  render();
}

function exportCustomers() {
  const csv = ["Name,Contact Person,Phone,Email,City,State,Pincode,GSTIN,Type,Status"].concat(state.customers.map((c) => `${c.name},${c.contactPerson},${c.phone},${c.email},${c.billingAddress.city},${c.billingAddress.state},${c.billingAddress.pincode},${c.gstin},${c.type},${c.status}`)).join("\n");
  download("customers-export.csv", csv);
}

function catalogAdmin() {
  if (state.editingProductId) return productEditor(state.editingProductId);
  return shell(`
    <section class="panel">
      <div class="section-title">
        <div><h2>Product catalog</h2><p>Brands, variants, MOQ, dealer/retailer pricing and GST.</p></div>
        <div class="row-actions"><button class="button secondary" onclick="startNewProduct()">Add product</button><button class="button ghost" onclick="exportProducts()">Export CSV</button></div>
      </div>
      ${productTable()}
    </section>`, "Catalog Management", "Manage product hierarchy and pricing tiers.");
}

function pricingSummary(product) {
  if (product.pricing?.mode === "flat") {
    return `Dealer ${money(product.pricing.flat?.priceDealer)}<br>Retailer ${money(product.pricing.flat?.priceRetailer)}`;
  }
  return `<span class="badge warn">Tiered</span> ${(product.pricing?.tiers || []).length} rule(s)`;
}

function productTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Image</th><th>Brand</th><th>Product</th><th>Category</th><th>Variants</th><th>Pricing</th><th>GST</th><th>Action</th></tr></thead><tbody>
    ${state.products.map((p, index) => `<tr>
      <td><div class="thumb-mini" style="${productImageStyle(p, index)}"></div></td>
      <td>${brandName(p.brandId)}</td>
      <td><strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.sku)}<br><span class="badge ${p.active ? "ok" : "bad"}">${p.active ? "Active" : "Inactive"}</span></td>
      <td>${escapeHtml(categoryFor(p)?.name || "-")}</td>
      <td>${p.variants.map((v) => escapeHtml(v.name)).join("<br>")}</td>
      <td>${pricingSummary(p)}</td>
      <td>${p.gstRate}%</td>
      <td class="row-actions"><button class="button secondary" onclick="editProduct('${p.id}')">Edit</button><button class="button ghost" onclick="toggleProduct('${p.id}')">${p.active ? "Deactivate" : "Activate"}</button></td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function startNewProduct() {
  setState({ editingProductId: "new" });
}

function editProduct(id) {
  setState({ editingProductId: id });
}

function toggleProduct(id) {
  const product = byId(state.products, id);
  product.active = !product.active;
  saveState();
  render();
}

function productEditor(productId) {
  const isNew = productId === "new";
  const p = isNew ? blankProduct() : normalizeProduct(byId(state.products, productId));
  const gallery = p.fullImageUrls || [];
  const category = categoryFor(p) || state.categories[0];
  const opticalDisplay = category?.hasOpticalParameters ? "" : "display:none";
  const cylAxisDisplay = category?.hasCylAxis ? "" : "display:none";
  const pricingMode = p.pricing?.mode || "flat";
  const flatDisplay = pricingMode === "flat" ? "" : "display:none";
  const tieredDisplay = pricingMode === "tiered" ? "" : "display:none";
  return shell(`
    <form class="grid" onsubmit="saveProduct(event, '${productId}')">
      <section class="panel">
        <div class="section-title"><div><h2>${isNew ? "Add product" : "Edit product"}</h2><p>Category, brand, fixed specifications, images, variant axes and pricing.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Category</label><select name="categoryId" onchange="toggleCategoryBlocks(this.value)">${state.categories.map((c) => `<option value="${c.id}" ${c.id === p.categoryId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Brand</label><select name="brandId">${state.brands.map((brand) => `<option value="${brand.id}" ${brand.id === p.brandId ? "selected" : ""}>${escapeHtml(brand.name)}</option>`).join("")}</select></div>
          ${field("name", "Product name", true, p.name)}
          ${field("sku", "SKU", true, p.sku)}
          ${field("productType", "Product type", true, p.productType)}
          ${field("replacementSchedule", "Replacement schedule", true, p.replacementSchedule)}
          ${field("material", "Material", true, p.material)}
          ${field("waterContent", "Water content", true, p.waterContent)}
          ${field("diameter", "Diameter", true, p.diameter)}
          ${field("baseCurve", "Base curve", true, p.baseCurve)}
          ${field("manufacturingMethod", "Manufacturing method", true, p.manufacturingMethod)}
          ${field("gstRate", "GST rate", true, p.gstRate, "number")}
          <div class="field"><label>Status</label><select name="active"><option value="true" ${p.active ? "selected" : ""}>Active</option><option value="false" ${!p.active ? "selected" : ""}>Inactive</option></select></div>
        </div>
        <div class="field" style="margin-top:12px"><label>Description</label><textarea name="description" required>${escapeHtml(p.description)}</textarea></div>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>Images</h2><p>Use URLs or choose local files for thumbnail and gallery previews.</p></div></div>
        <div class="grid two">
          <div class="field">
            <label>Thumbnail URL</label>
            <input name="thumbnailImageUrl" value="${escapeAttr(p.thumbnailImageUrl || "")}" placeholder="https://... or uploaded preview data">
            <input type="file" accept="image/*" onchange="loadThumbnailUpload(event)">
            <div id="thumbnailPreview" class="image-preview" style="${productImageStyle(p, 0)}"></div>
          </div>
          <div class="field">
            <label>Full image URLs</label>
            <textarea name="fullImageUrls" placeholder="One image URL per line">${escapeHtml(gallery.join("\n"))}</textarea>
            <input type="file" accept="image/*" multiple onchange="loadGalleryUpload(event)">
          </div>
        </div>
        <div id="galleryPreview" class="gallery-strip">${galleryPreview(gallery)}</div>
      </section>

      <section class="panel" id="opticalParamsBlock" style="${opticalDisplay}">
        <div class="section-title"><div><h2>Optical parameters</h2><p>Only applies when the selected category has sphere power. Edge/center thickness are fixed specs; the power range drives the order-time dropdown instead of free text.</p></div></div>
        <div class="grid two">
          ${field("edgeThickness", "Edge thickness", false, p.opticalParameters?.edgeThickness || "")}
          ${field("centerThicknessAtMinus3", "Center thickness at -3.00", false, p.opticalParameters?.centerThicknessAtMinus3 || "")}
        </div>
        <div class="section-title" style="margin-top:12px"><div><h3>Sphere power range segments</h3><p>Up to 6 segments; blank rows are ignored. Example: start 0, end -5.00, step 0.25 (descending), or start 0.50, end 4.00, step 0.20 (ascending).</p></div></div>
        <div class="grid">${powerRangeRows(p.opticalParameters?.powerRanges || [])}</div>
        <div id="cylAxisBlock" style="${cylAxisDisplay}">
          <div class="section-title" style="margin-top:12px"><h3>Toric: cylinder power + axis</h3></div>
          <div class="grid three">
            ${field("cylStart", "Cyl start", false, p.opticalParameters?.cylPowerRange?.start ?? "", "number")}
            ${field("cylEnd", "Cyl end", false, p.opticalParameters?.cylPowerRange?.end ?? "", "number")}
            ${field("cylStep", "Cyl step", false, p.opticalParameters?.cylPowerRange?.step ?? "", "number")}
          </div>
          <div class="grid three">
            ${field("axisStart", "Axis start", false, p.opticalParameters?.axisRange?.start ?? "", "number")}
            ${field("axisEnd", "Axis end", false, p.opticalParameters?.axisRange?.end ?? "", "number")}
            ${field("axisStep", "Axis step", false, p.opticalParameters?.axisRange?.step ?? "", "number")}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>Variant axes</h2><p>One value per line. Leave an axis blank to not use it for this product - saving regenerates the sellable variant list from these values.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Color options</label><textarea name="colorValues" placeholder="One color per line">${escapeHtml((p.variantAxisValues?.color || []).join("\n"))}</textarea></div>
          <div class="field"><label>Pack size options</label><textarea name="packSizeValues" placeholder="One pack size per line">${escapeHtml((p.variantAxisValues?.packSize || []).join("\n"))}</textarea></div>
        </div>
        <p class="notice">Currently ${p.variants.length} generated variant(s): ${p.variants.map((v) => escapeHtml(v.name)).join(", ") || "none yet"}.</p>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>Pricing</h2><p>Flat pricing applies one price to every variant. Tiered pricing resolves price from pack size and/or the power the customer selects (e.g. a different price above/below a power threshold).</p></div></div>
        <div class="field"><label>Pricing mode</label><select name="pricingMode" onchange="togglePricingBlocks(this.value)"><option value="flat" ${pricingMode === "flat" ? "selected" : ""}>Flat</option><option value="tiered" ${pricingMode === "tiered" ? "selected" : ""}>Tiered</option></select></div>
        <div id="flatPricingBlock" style="${flatDisplay}">
          <div class="grid two">
            ${field("flatMrp", "MRP", false, p.pricing?.flat?.mrp ?? "", "number")}
            ${field("flatDealer", "Dealer price", false, p.pricing?.flat?.priceDealer ?? "", "number")}
            ${field("flatRetailer", "Retailer price", false, p.pricing?.flat?.priceRetailer ?? "", "number")}
            ${field("minOrderQty", "Minimum order quantity", false, p.pricing?.flat?.minOrderQty ?? p.minOrderQty, "number")}
          </div>
        </div>
        <div id="tieredPricingBlock" style="${tieredDisplay}">
          <div class="section-title"><div><h3>Price tiers</h3><p>Up to 8 rows; blank rows are ignored. Pack size should match one of the values entered above. Leave "power &ge;" / "power &le;" blank to match on pack size alone.</p></div></div>
          <div class="grid">${tierRows(p.pricing?.tiers || [])}</div>
        </div>
      </section>

      <div class="row-actions">
        <button class="button">Save product</button>
        <button type="button" class="button secondary" onclick="setState({editingProductId:null})">Cancel</button>
      </div>
    </form>`, "Catalog Management", isNew ? "Create a new catalog item." : "Edit the selected catalog item.");
}

function powerRangeRows(ranges) {
  const rows = [...ranges];
  while (rows.length < 6) rows.push({ start: "", end: "", step: "" });
  return rows.slice(0, 6).map((seg, index) => `
    <div class="variant-row">
      ${field(`powerStart${index}`, `Segment ${index + 1} start`, false, seg.start ?? "", "number")}
      ${field(`powerEnd${index}`, `Segment ${index + 1} end`, false, seg.end ?? "", "number")}
      ${field(`powerStep${index}`, `Segment ${index + 1} step`, false, seg.step ?? "", "number")}
    </div>`).join("");
}

function tierRows(tiers) {
  const rows = [...tiers];
  while (rows.length < 8) rows.push({ match: {} });
  return rows.slice(0, 8).map((tier, index) => `
    <div class="variant-row">
      ${field(`tierPackSize${index}`, `Tier ${index + 1} pack size`, false, tier.match?.packSize || "")}
      ${field(`tierColor${index}`, "Color (optional)", false, tier.match?.color || "")}
      ${field(`tierPowerGte${index}`, "Power ≥", false, tier.match?.powerGte ?? "", "number")}
      ${field(`tierPowerLte${index}`, "Power ≤", false, tier.match?.powerLte ?? "", "number")}
      ${field(`tierMrp${index}`, "MRP", false, tier.mrp ?? "", "number")}
      ${field(`tierDealer${index}`, "Dealer price", false, tier.priceDealer ?? "", "number")}
      ${field(`tierRetailer${index}`, "Retailer price", false, tier.priceRetailer ?? "", "number")}
      ${field(`tierMoq${index}`, "MOQ", false, tier.minOrderQty ?? "", "number")}
    </div>`).join("");
}

function toggleCategoryBlocks(categoryId) {
  const category = byId(state.categories, categoryId);
  const opticalBlock = document.getElementById("opticalParamsBlock");
  const cylAxisBlock = document.getElementById("cylAxisBlock");
  if (opticalBlock) opticalBlock.style.display = category?.hasOpticalParameters ? "" : "none";
  if (cylAxisBlock) cylAxisBlock.style.display = category?.hasCylAxis ? "" : "none";
}

function togglePricingBlocks(mode) {
  const flatBlock = document.getElementById("flatPricingBlock");
  const tieredBlock = document.getElementById("tieredPricingBlock");
  if (flatBlock) flatBlock.style.display = mode === "flat" ? "" : "none";
  if (tieredBlock) tieredBlock.style.display = mode === "tiered" ? "" : "none";
}

function blankProduct() {
  return {
    id: "",
    categoryId: state.categories[0]?.id || "",
    brandId: state.brands[0]?.id || "",
    name: "",
    sku: "",
    description: "",
    thumbnailImageUrl: "",
    fullImageUrls: [],
    productType: "",
    replacementSchedule: "",
    material: "",
    waterContent: "",
    diameter: "",
    baseCurve: "",
    manufacturingMethod: "",
    minOrderQty: 1,
    gstRate: 12,
    active: true,
    opticalParameters: { edgeThickness: "", centerThicknessAtMinus3: "", powerRanges: [], cylPowerRange: null, axisRange: null },
    variantAxisValues: { color: [], packSize: [] },
    pricing: { mode: "flat", flat: { mrp: 0, priceDealer: 0, priceRetailer: 0, minOrderQty: 1 }, tiers: [] },
    variants: []
  };
}

function normalizeProduct(product) {
  return {
    ...product,
    thumbnailImageUrl: product.thumbnailImageUrl || "",
    fullImageUrls: product.fullImageUrls || [],
    opticalParameters: product.opticalParameters || { edgeThickness: "", centerThicknessAtMinus3: "", powerRanges: [], cylPowerRange: null, axisRange: null },
    variantAxisValues: product.variantAxisValues || { color: [], packSize: [] },
    pricing: product.pricing || { mode: "flat", flat: { mrp: 0, priceDealer: 0, priceRetailer: 0, minOrderQty: product.minOrderQty }, tiers: [] },
    variants: product.variants || []
  };
}

function saveProduct(event, productId) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const category = byId(state.categories, data.categoryId);

  const colorValues = String(data.colorValues || "").split("\n").map((v) => v.trim()).filter(Boolean);
  const packSizeValues = String(data.packSizeValues || "").split("\n").map((v) => v.trim()).filter(Boolean);

  const powerRanges = Array.from({ length: 6 }, (_, index) => ({
    start: data[`powerStart${index}`],
    end: data[`powerEnd${index}`],
    step: data[`powerStep${index}`]
  }))
    .filter((seg) => seg.start !== "" && seg.end !== "" && seg.step !== "")
    .map((seg) => ({ start: Number(seg.start), end: Number(seg.end), step: Number(seg.step) }));

  const cylPowerRange = data.cylStart !== "" && data.cylEnd !== "" && data.cylStep !== ""
    ? { start: Number(data.cylStart), end: Number(data.cylEnd), step: Number(data.cylStep) }
    : null;
  const axisRange = data.axisStart !== "" && data.axisEnd !== "" && data.axisStep !== ""
    ? { start: Number(data.axisStart), end: Number(data.axisEnd), step: Number(data.axisStep) }
    : null;

  const opticalParameters = category?.hasOpticalParameters ? {
    edgeThickness: String(data.edgeThickness || "").trim(),
    centerThicknessAtMinus3: String(data.centerThicknessAtMinus3 || "").trim(),
    powerRanges,
    cylPowerRange: category.hasCylAxis ? cylPowerRange : null,
    axisRange: category.hasCylAxis ? axisRange : null
  } : null;

  const pricingMode = data.pricingMode === "tiered" ? "tiered" : "flat";
  const flat = pricingMode === "flat" ? {
    mrp: Number(data.flatMrp || 0),
    priceDealer: Number(data.flatDealer || 0),
    priceRetailer: Number(data.flatRetailer || 0),
    minOrderQty: Number(data.minOrderQty || 1)
  } : null;
  const tiers = pricingMode === "tiered"
    ? Array.from({ length: 8 }, (_, index) => ({
        match: {
          packSize: String(data[`tierPackSize${index}`] || "").trim() || undefined,
          color: String(data[`tierColor${index}`] || "").trim() || undefined,
          powerGte: data[`tierPowerGte${index}`] !== "" ? Number(data[`tierPowerGte${index}`]) : undefined,
          powerLte: data[`tierPowerLte${index}`] !== "" ? Number(data[`tierPowerLte${index}`]) : undefined
        },
        mrp: Number(data[`tierMrp${index}`] || 0),
        priceDealer: Number(data[`tierDealer${index}`] || 0),
        priceRetailer: Number(data[`tierRetailer${index}`] || 0),
        minOrderQty: data[`tierMoq${index}`] !== "" ? Number(data[`tierMoq${index}`]) : undefined
      })).filter((tier) => tier.priceDealer || tier.priceRetailer || tier.mrp)
    : [];

  const product = {
    id: productId === "new" ? "p" + Date.now() : productId,
    categoryId: data.categoryId,
    brandId: data.brandId,
    name: String(data.name || "").trim(),
    sku: String(data.sku || "").trim(),
    description: String(data.description || "").trim(),
    thumbnailImageUrl: String(data.thumbnailImageUrl || "").trim(),
    fullImageUrls: String(data.fullImageUrls || "").split("\n").map((url) => url.trim()).filter(Boolean),
    productType: String(data.productType || "").trim(),
    replacementSchedule: String(data.replacementSchedule || "").trim(),
    material: String(data.material || "").trim(),
    waterContent: String(data.waterContent || "").trim(),
    diameter: String(data.diameter || "").trim(),
    baseCurve: String(data.baseCurve || "").trim(),
    manufacturingMethod: String(data.manufacturingMethod || "").trim(),
    minOrderQty: Number(data.minOrderQty || 1),
    gstRate: Number(data.gstRate),
    active: data.active === "true",
    opticalParameters,
    variantAxisValues: { color: colorValues, packSize: packSizeValues },
    pricing: { mode: pricingMode, flat, tiers }
  };
  product.variants = generateVariants(product);

  if (productId === "new") {
    state.products.push(product);
  } else {
    const index = state.products.findIndex((entry) => entry.id === productId);
    state.products[index] = product;
  }
  state.editingProductId = null;
  saveState();
  render();
}

function productImageStyle(product, index = 0) {
  const url = product?.thumbnailImageUrl || product?.fullImageUrls?.[0];
  if (!url) return "";
  const safeUrl = String(url).replaceAll("'", "%27");
  // escapeAttr closes the double-quote attribute-breakout: a url containing a
  // literal `"` can no longer end the surrounding style="..." attribute early.
  return escapeAttr(`background-image:url('${safeUrl}')`);
}

function galleryPreview(urls) {
  if (!urls.length) return `<div class="empty">No gallery images added yet.</div>`;
  return urls.map((url) => {
    const safeUrl = String(url).replaceAll("'", "%27");
    return `<div class="gallery-thumb" style="${escapeAttr(`background-image:url('${safeUrl}')`)}"></div>`;
  }).join("");
}

function loadThumbnailUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const input = event.target.closest(".field").querySelector('input[name="thumbnailImageUrl"]');
    input.value = reader.result;
    const preview = document.getElementById("thumbnailPreview");
    if (preview) preview.style.backgroundImage = `url('${reader.result}')`;
  };
  reader.readAsDataURL(file);
}

function loadGalleryUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const textarea = event.target.closest(".field").querySelector('textarea[name="fullImageUrls"]');
  const reads = files.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  }));
  Promise.all(reads).then((urls) => {
    const existing = textarea.value.trim();
    textarea.value = [existing, ...urls].filter(Boolean).join("\n");
    const preview = document.getElementById("galleryPreview");
    if (preview) preview.innerHTML = galleryPreview(textarea.value.split("\n").filter(Boolean));
  });
}

function exportProducts() {
  const rows = state.products.flatMap((p) => {
    if (p.pricing?.mode === "flat") {
      return p.variants.map((v) => `${brandName(p.brandId)},${p.name},${v.name},flat,${p.pricing.flat.priceDealer},${p.pricing.flat.priceRetailer},${p.pricing.flat.minOrderQty},${p.gstRate},${v.sku}`);
    }
    return (p.pricing?.tiers || []).map((t) => `${brandName(p.brandId)},${p.name},${t.match.packSize || "Any pack"},tiered,${t.priceDealer},${t.priceRetailer},${t.minOrderQty || p.minOrderQty},${p.gstRate},${p.sku}`);
  });
  const csv = ["Brand,Product Name,Variant/Tier,Pricing Mode,Price Dealer,Price Retailer,Min Order Qty,GST Rate,SKU"].concat(rows).join("\n");
  download("products-export.csv", csv);
}

function vertexCalculatorView() {
  const defaultSphere = -6;
  let initialResult = null;
  let initialError = "";
  try {
    initialResult = convertSpectacleRxToContactLens(defaultSphere, 0, DEFAULT_VERTEX_DISTANCE_M);
  } catch (error) {
    initialError = error.message;
  }
  return shell(`
    <div class="split">
      <section class="panel grid">
        <div class="section-title"><div><h3>Spectacle prescription</h3><p>Enter the spectacle Rx to see the equivalent contact lens power.</p></div></div>
        <div class="grid two">
          ${field("vxSphere", "Sphere power (D)", true, defaultSphere, "number", "updateVertexResult()")}
          ${field("vxCyl", "Cylinder power (D, optional)", false, "", "number", "updateVertexResult()")}
          ${field("vxAxis", "Axis (degrees, optional)", false, "", "number", "updateVertexResult()")}
          ${field("vxDistance", "Vertex distance (mm)", true, DEFAULT_VERTEX_DISTANCE_M * 1000, "number", "updateVertexResult()")}
        </div>
      </section>
      <aside class="panel" id="vertexResult">${vertexResultHtml(initialResult, initialError)}</aside>
    </div>`, "Vertex Distance Calculator", "Converts a spectacle prescription to the equivalent contact lens power, correcting for vertex distance. Not part of the order flow - a reference tool only.");
}

function vertexResultHtml(result, error) {
  if (error) {
    return `<div class="section-title"><h3>Contact lens power</h3></div><div class="notice bad">${escapeHtml(error)}</div>`;
  }
  if (!result) {
    return `<div class="section-title"><h3>Contact lens power</h3></div><div class="empty">Enter a sphere power to see the converted result.</div>`;
  }
  const hasAxis = result.axis !== null && result.axis !== undefined && Number.isFinite(result.axis);
  return `
    <div class="section-title"><h3>Contact lens power</h3><p>Rounded to the nearest 0.25D.</p></div>
    <div class="totals">
      <div><span>Sphere</span><strong>${formatPowerValue(result.sphere)}</strong></div>
      ${result.cyl ? `<div><span>Cylinder</span><strong>${formatPowerValue(result.cyl)}</strong></div>` : ""}
      ${hasAxis ? `<div><span>Axis</span><strong>${result.axis}&deg;</strong></div>` : ""}
    </div>`;
}

function updateVertexResult() {
  const sphereRaw = document.querySelector('[name="vxSphere"]')?.value ?? "";
  const cylRaw = document.querySelector('[name="vxCyl"]')?.value ?? "";
  const axisRaw = document.querySelector('[name="vxAxis"]')?.value ?? "";
  const distanceRaw = document.querySelector('[name="vxDistance"]')?.value ?? "";
  const panel = document.getElementById("vertexResult");
  if (!panel) return;

  if (sphereRaw === "") {
    panel.innerHTML = vertexResultHtml(null);
    return;
  }

  const vertexDistanceMeters = (distanceRaw === "" ? DEFAULT_VERTEX_DISTANCE_M * 1000 : Number(distanceRaw)) / 1000;
  try {
    const result = convertSpectacleRxToContactLens(Number(sphereRaw), cylRaw === "" ? 0 : Number(cylRaw), vertexDistanceMeters);
    panel.innerHTML = vertexResultHtml({ ...result, axis: axisRaw === "" ? null : Number(axisRaw) });
  } catch (error) {
    panel.innerHTML = vertexResultHtml(null, error.message);
  }
}

function orderStatusCounts() {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  state.orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
  return counts;
}

function reportsView() {
  const salesByCustomer = state.customers.map((c) => ({ c, orders: state.orders.filter((o) => o.customerId === c.id && o.status !== "Cancelled") })).filter((row) => row.orders.length);
  const top = {};
  state.orders.forEach((o) => o.lineItems.forEach((line) => {
    top[line.productName] = top[line.productName] || { qty: 0, revenue: 0 };
    top[line.productName].qty += line.quantity;
    top[line.productName].revenue += line.lineTotal;
  }));
  const statusCounts = orderStatusCounts();
  return shell(`
    <div class="grid two">
      <section class="panel"><div class="section-title"><h2>Sales by dealer/retailer</h2></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Orders</th><th>Total</th></tr></thead><tbody>${salesByCustomer.map((row) => `<tr><td>${escapeHtml(row.c.name)}</td><td>${row.orders.length}</td><td>${money(row.orders.reduce((sum, o) => sum + o.grandTotal, 0))}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="section-title"><h2>Top products</h2></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>${Object.entries(top).map(([name, val]) => `<tr><td>${escapeHtml(name)}</td><td>${val.qty}</td><td>${money(val.revenue)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="section-title"><div><h2>Order status</h2><p>How many orders currently sit in the queue at each workflow status.</p></div></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Orders</th></tr></thead><tbody>${STATUSES.map((status) => `<tr><td><span class="badge ${statusTone[status] || ""}">${escapeHtml(status)}</span></td><td>${statusCounts[status]}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel">${pendingOrdersTable()}</section>
      <section class="panel"><div class="section-title"><h2>Order aging</h2></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Open days</th></tr></thead><tbody>${state.orders.filter((o) => !["Closed", "Cancelled"].includes(o.status)).map((o) => `<tr><td>${escapeHtml(o.orderNumber)}</td><td>${escapeHtml(o.status)}</td><td>${Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 86400000))}</td></tr>`).join("")}</tbody></table></div></section>
    </div>`, "Reports", "Sales, pending orders, aging and best-selling products.");
}

function notificationsView() {
  return shell(`
    <section class="panel">
      <div class="section-title"><div><h2>Notification settings</h2><p>Configure channels independently by event and recipient.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Event</th><th>Email</th><th>SMS</th><th>WhatsApp</th><th>Recipient</th></tr></thead><tbody>
        ${state.notificationSettings.map((n, index) => `<tr><td>${escapeHtml(n.event)}</td>${["email","sms","whatsapp"].map((ch) => `<td><input type="checkbox" ${n.channelsEnabled[ch] ? "checked" : ""} onchange="toggleChannel(${index}, '${ch}', this.checked)"></td>`).join("")}<td><select onchange="setRecipient(${index}, this.value)"><option ${n.recipient === "customer" ? "selected" : ""}>customer</option><option ${n.recipient === "admin" ? "selected" : ""}>admin</option><option ${n.recipient === "both" ? "selected" : ""}>both</option></select></td></tr>`).join("")}
      </tbody></table></div>
    </section>`, "Notifications", "Email, SMS and WhatsApp are modeled as swappable provider settings.");
}

function toggleChannel(index, channel, checked) {
  state.notificationSettings[index].channelsEnabled[channel] = checked;
  saveState();
}

function setRecipient(index, value) {
  state.notificationSettings[index].recipient = value;
  saveState();
}

function adminUsersView() {
  if (state.addingAdminUser) return addAdminUserForm();
  if (state.resettingPasswordForAdminId) return resetAdminPasswordForm(state.resettingPasswordForAdminId);
  return shell(`
    <section class="panel">
      <div class="section-title"><div><h2>Admin users</h2><p>Super Admin can create staff accounts, reset their password, and remove them.</p></div><button class="button" onclick="setState({addingAdminUser:true})">Add admin user</button></div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>${state.adminUsers.map((u) => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td class="row-actions">${u.role === "Super Admin" ? "" : `<button class="button secondary" onclick="setState({resettingPasswordForAdminId:'${u.id}'})">Reset password</button><button class="button bad" onclick="removeAdminUser('${u.id}')">Remove</button>`}</td></tr>`).join("")}</tbody></table></div>
    </section>`, "Admin User Management", "Single staff permission tier plus Super Admin ownership.");
}

function addAdminUserForm() {
  return shell(`
    <form class="panel grid" onsubmit="createAdminUser(event)">
      <div class="section-title"><div><h2>Add admin user</h2><p>Creates a new Admin User (Operations Staff) account with a real, immediately usable password.</p></div></div>
      <div class="grid two">
        ${field("name", "Name", true)}
        ${field("email", "Email", true, "", "email")}
        ${field("password", "Password", true, "", "password")}
      </div>
      <div class="row-actions">
        <button class="button">Create admin user</button>
        <button type="button" class="button secondary" onclick="setState({addingAdminUser:false})">Cancel</button>
      </div>
    </form>`, "Admin User Management", "Create a new staff account.", `<button class="button secondary" onclick="setState({addingAdminUser:false})">Back</button>`);
}

function resetAdminPasswordForm(id) {
  const target = byId(state.adminUsers, id);
  if (!target) return shell(`<div class="empty">Admin user not found.</div>`, "Admin User Management", "", `<button class="button secondary" onclick="setState({resettingPasswordForAdminId:null})">Back</button>`);
  return shell(`
    <form class="panel grid" onsubmit="resetAdminPassword(event, '${target.id}')">
      <div class="section-title"><div><h2>Reset password</h2><p>Set a new password for ${escapeHtml(target.name)} (${escapeHtml(target.email)}).</p></div></div>
      ${field("password", "New password", true, "", "password")}
      <div class="row-actions">
        <button class="button">Reset password</button>
        <button type="button" class="button secondary" onclick="setState({resettingPasswordForAdminId:null})">Cancel</button>
      </div>
    </form>`, "Admin User Management", "Set a new password for this staff account.", `<button class="button secondary" onclick="setState({resettingPasswordForAdminId:null})">Back</button>`);
}

async function createAdminUser(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  try {
    const result = await apiRequest("/api/admin-actions/admin-users", {
      method: "POST",
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password })
    });
    state.adminUsers.push(result.adminUser);
    setState({ addingAdminUser: false });
  } catch (error) {
    alert(error.message || "Unable to create admin user.");
  }
}

async function resetAdminPassword(event, id) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  try {
    await apiRequest(`/api/admin-actions/admin-users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password: data.password })
    });
    alert("Password updated.");
    setState({ resettingPasswordForAdminId: null });
  } catch (error) {
    alert(error.message || "Unable to reset password.");
  }
}

function removeAdminUser(id) {
  state.adminUsers = state.adminUsers.filter((u) => u.id !== id);
  saveState();
  render();
}

function configurationsView() {
  const config = state.integrationConfigs || {};
  const gmail = config.gmail || {};
  const whatsapp = config.whatsapp || {};
  const sms = config.sms || {};
  return shell(`
    <form class="grid" onsubmit="saveIntegrationConfigs(event)">
      <section class="panel">
        <div class="section-title"><div><h2>Gmail (email)</h2><p>Used to send order and approval notification emails from a Gmail account.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Enabled</label><select name="gmailEnabled"><option value="true" ${gmail.enabled ? "selected" : ""}>Yes</option><option value="false" ${!gmail.enabled ? "selected" : ""}>No</option></select></div>
          ${field("gmailEmailAddress", "Gmail address", false, gmail.emailAddress || "", "email")}
          ${field("gmailAppPassword", "App password", false, gmail.appPassword || "", "password")}
          ${field("gmailSenderName", "Sender display name", false, gmail.senderName || "")}
        </div>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>WhatsApp Business</h2><p>Used to send WhatsApp notifications via the WhatsApp Business/Cloud API.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Enabled</label><select name="whatsappEnabled"><option value="true" ${whatsapp.enabled ? "selected" : ""}>Yes</option><option value="false" ${!whatsapp.enabled ? "selected" : ""}>No</option></select></div>
          ${field("whatsappBusinessPhoneNumberId", "Business phone number ID", false, whatsapp.businessPhoneNumberId || "")}
          ${field("whatsappAccessToken", "Access token", false, whatsapp.accessToken || "", "password")}
          ${field("whatsappFromPhoneNumber", "Sending phone number", false, whatsapp.fromPhoneNumber || "")}
        </div>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>SMS gateway</h2><p>Used to send SMS notifications through a third-party SMS gateway.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Enabled</label><select name="smsEnabled"><option value="true" ${sms.enabled ? "selected" : ""}>Yes</option><option value="false" ${!sms.enabled ? "selected" : ""}>No</option></select></div>
          ${field("smsProvider", "Provider", false, sms.provider || "")}
          ${field("smsApiKey", "API key", false, sms.apiKey || "", "password")}
          ${field("smsSenderId", "Sender ID", false, sms.senderId || "")}
        </div>
      </section>

      <div class="row-actions">
        <button class="button">Save configuration</button>
      </div>
    </form>`, "Configurations", "Third-party integrations for sending email, WhatsApp and SMS notifications. Admin-only - never sent to dealer/retailer sessions.");
}

function saveIntegrationConfigs(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  state.integrationConfigs = {
    gmail: {
      enabled: data.gmailEnabled === "true",
      emailAddress: String(data.gmailEmailAddress || "").trim(),
      appPassword: String(data.gmailAppPassword || "").trim(),
      senderName: String(data.gmailSenderName || "").trim()
    },
    whatsapp: {
      enabled: data.whatsappEnabled === "true",
      businessPhoneNumberId: String(data.whatsappBusinessPhoneNumberId || "").trim(),
      accessToken: String(data.whatsappAccessToken || "").trim(),
      fromPhoneNumber: String(data.whatsappFromPhoneNumber || "").trim()
    },
    sms: {
      enabled: data.smsEnabled === "true",
      provider: String(data.smsProvider || "").trim(),
      apiKey: String(data.smsApiKey || "").trim(),
      senderId: String(data.smsSenderId || "").trim()
    }
  };
  saveState();
  alert("Configuration saved.");
  render();
}

function customerDashboard() {
  const orders = orderForCustomer();
  return shell(`
    <div class="grid three">
      ${metric("Orders", orders.length, "Your order history")}
      ${metric("Open value", money(orders.filter((o) => !["Closed", "Cancelled"].includes(o.status)).reduce((s, o) => s + o.grandTotal, 0)), "Before closure")}
      ${metric("Cart lines", state.cart.length, "Ready for review")}
    </div>
    <section class="panel" style="margin-top:14px"><div class="section-title"><h2>Recent orders</h2><button class="button secondary" onclick="go('catalog')">Browse catalog</button></div>${ordersTable(orders, false)}</section>
  `, "Customer Dashboard", "Place orders, track statuses and download invoices.");
}

function priceLabel(product, customerType) {
  if (product.pricing?.mode === "flat") {
    return money(customerType === "dealer" ? product.pricing.flat.priceDealer : product.pricing.flat.priceRetailer);
  }
  const prices = (product.pricing?.tiers || []).map((t) => (customerType === "dealer" ? t.priceDealer : t.priceRetailer)).filter(Boolean);
  return prices.length ? `From ${money(Math.min(...prices))}` : "-";
}

function catalogView() {
  const customer = currentCustomer();
  if (state.selectedProductId) return productDetail(state.selectedProductId);
  const content = `
    <div class="grid three">
      ${state.products.filter((p) => p.active).map((p, index) => `
        <article class="card catalog-card">
          <div class="product-art ${index % 2 ? "alt" : ""}" style="${productImageStyle(p, index)}"></div>
          <div class="catalog-body">
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.description)}</p>
            <div class="row-actions">
              <span class="badge">${brandName(p.brandId)}</span>
              <span class="badge">MOQ ${p.minOrderQty}</span>
              <span class="badge ok">${priceLabel(p, customer.type)}</span>
            </div>
            <button class="button" style="margin-top:12px;width:100%" onclick="selectProduct('${p.id}')">Open product</button>
          </div>
        </article>`).join("")}
    </div>`;
  return shell(content, "Product Catalog", "Browse by brand, product, variant and specification.");
}

function selectProduct(id) {
  setState({ selectedProductId: id });
}

function productDetail(id) {
  const p = byId(state.products, id);
  const category = categoryFor(p);
  const customer = currentCustomer();
  const gallery = [p.thumbnailImageUrl, ...(p.fullImageUrls || [])].filter(Boolean);
  const powerOptions = category?.hasOpticalParameters ? expandRanges(p.opticalParameters?.powerRanges) : [];
  const cylOptions = category?.hasCylAxis && p.opticalParameters?.cylPowerRange ? expandRanges([p.opticalParameters.cylPowerRange]) : [];
  const axisOptions = category?.hasCylAxis && p.opticalParameters?.axisRange ? expandRanges([p.opticalParameters.axisRange]) : [];
  const initialVariant = p.variants[0];
  let initialPrice = "Select options to see price";
  try { initialPrice = money(resolveUnitPrice(p, initialVariant, powerOptions[0], customer.type)); } catch { /* leave placeholder */ }

  return shell(`
    <div class="split">
      <section class="panel">
        <div class="product-art" style="border-radius:8px;min-height:260px;margin-bottom:14px;${productImageStyle(p, 0)}"></div>
        ${gallery.length ? `<div class="gallery-strip" style="margin-bottom:14px">${galleryPreview(gallery)}</div>` : ""}
        <div class="section-title"><div><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description)}</p></div><span class="badge">${brandName(p.brandId)}</span></div>
        <div class="grid two">
          <div><h3>Specifications</h3><p>
            <strong>Type:</strong> ${escapeHtml(p.productType)}<br>
            <strong>Replacement:</strong> ${escapeHtml(p.replacementSchedule)}<br>
            <strong>Material:</strong> ${escapeHtml(p.material)}<br>
            <strong>Water content:</strong> ${escapeHtml(p.waterContent)}<br>
            <strong>Diameter:</strong> ${escapeHtml(p.diameter)}<br>
            <strong>Base curve:</strong> ${escapeHtml(p.baseCurve)}<br>
            <strong>Manufacturing:</strong> ${escapeHtml(p.manufacturingMethod)}${category?.hasOpticalParameters ? `<br>
            <strong>Edge thickness:</strong> ${escapeHtml(p.opticalParameters?.edgeThickness || "-")}<br>
            <strong>Center thickness @ -3.00:</strong> ${escapeHtml(p.opticalParameters?.centerThicknessAtMinus3 || "-")}` : ""}
          </p></div>
          <div><h3>Available options</h3>${p.variants.map((v) => `<div class="line-item"><strong>${escapeHtml(v.name)}</strong><span>${escapeHtml(v.sku)}</span></div>`).join("")}</div>
        </div>
      </section>
      <aside class="panel">
        <form class="grid" onsubmit="addToCart(event, '${p.id}')">
          <div class="section-title"><h3>Place an order line</h3></div>
          <div id="orderLineRows" data-next-index="1">${orderLineRowHtml(p, category, powerOptions, cylOptions, axisOptions, 0, initialPrice)}</div>
          ${category?.hasOpticalParameters ? `<button type="button" class="button ghost" onclick="addOrderLineRow('${p.id}')">+ Add another power</button>` : ""}
          <button class="button">Add all to cart</button>
        </form>
      </aside>
    </div>`, "Product Detail", "Specifications are fixed per product; add one or more power options below, then add them all to cart together.", `<button class="button secondary" onclick="setState({selectedProductId:null})">Back</button>`);
}

// One row = one order line's worth of selections (variant/power/cyl/axis/qty).
// Field names carry a per-row index suffix so several rows can coexist inside
// the same <form> and addToCart() can read them all back via FormData - this
// is what lets a customer add multiple power options for one product in a
// single "Add all to cart" instead of reopening the product per power.
function orderLineRowHtml(product, category, powerOptions, cylOptions, axisOptions, rowIndex, initialPriceText = "Select options to see price") {
  return `
    <div class="order-line-row" data-row-index="${rowIndex}">
      ${rowIndex > 0 ? `<div class="row-actions" style="justify-content:flex-end"><button type="button" class="button ghost" onclick="removeOrderLineRow(${rowIndex})">Remove this power</button></div>` : ""}
      <div class="field"><label>Variant</label><select name="variantId-${rowIndex}" onchange="updatePricePreview('${product.id}', ${rowIndex})">${product.variants.map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join("")}</select></div>
      ${category?.hasOpticalParameters ? `<div class="field"><label>Power</label><select name="power-${rowIndex}" onchange="updatePricePreview('${product.id}', ${rowIndex})">${powerOptions.map((v) => `<option value="${v}">${escapeHtml(formatPowerValue(v))}</option>`).join("")}</select></div>` : ""}
      ${category?.hasCylAxis && cylOptions.length ? `<div class="field"><label>Cyl power</label><select name="cyl-${rowIndex}" onchange="updatePricePreview('${product.id}', ${rowIndex})">${cylOptions.map((v) => `<option value="${v}">${escapeHtml(formatPowerValue(v))}</option>`).join("")}</select></div>` : ""}
      ${category?.hasCylAxis && axisOptions.length ? `<div class="field"><label>Axis</label><select name="axis-${rowIndex}" onchange="updatePricePreview('${product.id}', ${rowIndex})">${axisOptions.map((v) => `<option value="${v}">${escapeHtml(String(v))}°</option>`).join("")}</select></div>` : ""}
      ${field(`quantity-${rowIndex}`, "Quantity", true, product.minOrderQty, "number")}
      <div class="notice">Unit price: <strong id="pricePreview-${rowIndex}">${initialPriceText}</strong></div>
    </div>`;
}

function addOrderLineRow(productId) {
  const product = byId(state.products, productId);
  const category = categoryFor(product);
  const powerOptions = category?.hasOpticalParameters ? expandRanges(product.opticalParameters?.powerRanges) : [];
  const cylOptions = category?.hasCylAxis && product.opticalParameters?.cylPowerRange ? expandRanges([product.opticalParameters.cylPowerRange]) : [];
  const axisOptions = category?.hasCylAxis && product.opticalParameters?.axisRange ? expandRanges([product.opticalParameters.axisRange]) : [];
  const container = document.getElementById("orderLineRows");
  const rowIndex = Number(container.dataset.nextIndex || "1");
  container.insertAdjacentHTML("beforeend", orderLineRowHtml(product, category, powerOptions, cylOptions, axisOptions, rowIndex));
  container.dataset.nextIndex = String(rowIndex + 1);
  updatePricePreview(productId, rowIndex);
}

function removeOrderLineRow(rowIndex) {
  document.querySelector(`.order-line-row[data-row-index="${rowIndex}"]`)?.remove();
}

function updatePricePreview(productId, rowIndex = 0) {
  const product = byId(state.products, productId);
  const customer = currentCustomer();
  const variantSelect = document.querySelector(`select[name="variantId-${rowIndex}"]`);
  const powerSelect = document.querySelector(`select[name="power-${rowIndex}"]`);
  const variant = product.variants.find((v) => v.id === variantSelect?.value) || product.variants[0];
  const power = powerSelect ? powerSelect.value : undefined;
  const preview = document.getElementById(`pricePreview-${rowIndex}`);
  if (!preview) return;
  try {
    preview.textContent = money(resolveUnitPrice(product, variant, power, customer.type));
  } catch {
    preview.textContent = "Select options to see price";
  }
}

function addToCart(event, productId) {
  event.preventDefault();
  const customer = currentCustomer();
  const product = byId(state.products, productId);
  const category = categoryFor(product);
  const data = Object.fromEntries(new FormData(event.target).entries());
  const rowIndexes = [...new Set(Object.keys(data).map((key) => key.split("-").pop()))].sort((a, b) => Number(a) - Number(b));

  const newLines = [];
  for (const rowIndex of rowIndexes) {
    const variant = product.variants.find((v) => v.id === data[`variantId-${rowIndex}`]);
    const powerRaw = data[`power-${rowIndex}`];
    const cylRaw = data[`cyl-${rowIndex}`];
    const axisRaw = data[`axis-${rowIndex}`];
    const power = category?.hasOpticalParameters && powerRaw !== undefined && powerRaw !== "" ? Number(powerRaw) : null;
    const cyl = category?.hasCylAxis && cylRaw !== undefined && cylRaw !== "" ? Number(cylRaw) : null;
    const axis = category?.hasCylAxis && axisRaw !== undefined && axisRaw !== "" ? Number(axisRaw) : null;
    const quantity = Number(data[`quantity-${rowIndex}`]);
    const rowLabel = `${variant.name}${power !== null ? ` @ ${formatPowerValue(power)}` : ""}`;
    const min = resolveMinOrderQty(product, variant, power);
    if (!Number.isFinite(quantity) || quantity < min) {
      alert(`Minimum order quantity for ${rowLabel} is ${min}.`);
      return;
    }
    let unitPrice;
    try {
      unitPrice = resolveUnitPrice(product, variant, power, customer.type);
    } catch (error) {
      alert(`${rowLabel}: ${error.message}`);
      return;
    }
    newLines.push(item(product.id, variant.id, brandName(product.brandId), product.name, variant.name, power, cyl, axis, quantity, unitPrice, product.gstRate));
  }

  state.cart.push(...newLines);
  saveState();
  setState({ selectedProductId: null, view: "cart" });
}

function cartView() {
  const tempOrder = withTotals({ lineItems: state.cart });
  return shell(`
    <div class="split">
      <section class="panel">
        <div class="section-title"><div><h2>Review order</h2><p>Pricing and GST are resolved for your account tier.</p></div></div>
        ${state.cart.length ? lineItemsTable(tempOrder) : `<div class="empty">Your cart is empty.</div>`}
      </section>
      <aside class="panel">
        <div class="totals">
          <div><span>Subtotal</span><strong>${money(tempOrder.subTotal)}</strong></div>
          <div><span>GST</span><strong>${money(tempOrder.gstAmount)}</strong></div>
          <div><span>Grand total</span><strong>${money(tempOrder.grandTotal)}</strong></div>
        </div>
        <div class="row-actions" style="margin-top:14px">
          <button class="button" ${state.cart.length ? "" : "disabled"} onclick="submitOrder()">Submit order</button>
          <button class="button secondary" onclick="setState({cart:[]})">Clear</button>
        </div>
      </aside>
    </div>`, "Cart", "Submit a complete order for manual admin processing.");
}

async function submitOrder() {
  const cart = state.cart.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    power: line.specifications.power,
    cyl: line.specifications.cyl,
    axis: line.specifications.axis
  }));
  try {
    // Price/GST/MOQ are resolved server-side from the current catalog, not
    // trusted from this local cart - see /api/customer-actions/orders.
    const result = await apiRequest("/api/customer-actions/orders", {
      method: "POST",
      body: JSON.stringify({ cart })
    });
    state.orders.unshift(result.order);
    state.cart = [];
    setState({ view: "my-orders", activeOrderId: result.order.id });
  } catch (error) {
    alert(error.message || "Unable to submit order.");
  }
}

function myOrdersView() {
  if (state.activeOrderId) return orderDetail(state.activeOrderId, false);
  return shell(`<section class="panel">${ordersTable(orderForCustomer(), false)}</section>`, "My Orders", "Track submitted orders and view invoice-ready detail.");
}

function profileView() {
  const c = currentCustomer();
  return shell(`
    <section class="panel grid">
      <div class="section-title"><div><h2>${escapeHtml(c.name)}</h2><p>${escapeHtml(c.type)} account - <span class="badge ${statusTone[c.status]}">${escapeHtml(c.status)}</span></p></div></div>
      <div class="grid two">
        <div><h3>Billing address</h3><p>${address(c.billingAddress)}</p></div>
        <div><h3>Shipping address</h3><p>${address(c.shippingAddress)}</p></div>
      </div>
      <div class="grid three">
        <label><input type="checkbox" ${c.notificationPreferences.email ? "checked" : ""} onchange="setPref('email', this.checked)"> Email</label>
        <label><input type="checkbox" ${c.notificationPreferences.sms ? "checked" : ""} onchange="setPref('sms', this.checked)"> SMS</label>
        <label><input type="checkbox" ${c.notificationPreferences.whatsapp ? "checked" : ""} onchange="setPref('whatsapp', this.checked)"> WhatsApp</label>
      </div>
    </section>`, "Profile", "Addresses and channel-level notification preferences.");
}

async function setPref(channel, checked) {
  const customer = currentCustomer();
  const nextPrefs = { ...customer.notificationPreferences, [channel]: checked };
  try {
    await apiRequest("/api/customer-actions/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify({ notificationPreferences: nextPrefs })
    });
    customer.notificationPreferences = nextPrefs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    alert(error.message || "Unable to update notification preferences.");
  }
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function initialize() {
  document.getElementById("app").innerHTML = `<div class="empty" style="margin:24px">Loading order management workspace...</div>`;
  authToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
  if (API_BASE_URL && authToken && storedUser) {
    try {
      const user = JSON.parse(storedUser);
      const remoteState = await apiRequest("/api/state");
      state = { ...clone(seed), ...remoteState, session: sessionFromUser(user), view: defaultViewForRole(user.role), cart: [] };
      render();
      return;
    } catch (error) {
      console.warn("Stored session is no longer valid.", error);
      authToken = null;
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }
  state = clone(seed);
  render();
}

initialize();
