const STORAGE_KEY = "oms-demo-state-v1";
const CONFIG = window.__OMS_CONFIG__ || {};
const API_BASE_URL = String(CONFIG.apiBaseUrl || "").replace(/\/$/, "");

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
    { id: "b1", name: "AquaLux", active: true },
    { id: "b2", name: "OptiWear", active: true }
  ],
  products: [
    {
      id: "p1",
      brandId: "b1",
      name: "AquaLux Daily Clear",
      sku: "AL-DAILY-CLEAR",
      description: "Daily disposable hydrogel lenses for clear everyday wear.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      minOrderQty: 6,
      priceDealer: 245,
      priceRetailer: 310,
      gstRate: 12,
      active: true,
      specFieldLabels: { field1: "Power", field2: "Base Curve", field3: "Diameter" },
      variants: [
        { id: "v1", name: "30 Lens Pack", sku: "ALDC-30", minOrderQty: 6, priceDealer: 245, priceRetailer: 310, active: true },
        { id: "v2", name: "90 Lens Pack", sku: "ALDC-90", minOrderQty: 3, priceDealer: 690, priceRetailer: 825, active: true }
      ]
    },
    {
      id: "p2",
      brandId: "b1",
      name: "AquaLux Color",
      sku: "AL-COLOR",
      description: "Soft cosmetic lenses with breathable comfort and natural tones.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      minOrderQty: 4,
      priceDealer: 280,
      priceRetailer: 350,
      gstRate: 12,
      active: true,
      specFieldLabels: { field1: "Power", field2: "Base Curve", field3: "Diameter" },
      variants: [
        { id: "v3", name: "Blue", sku: "ALC-BLUE", minOrderQty: 4, priceDealer: 295, priceRetailer: 365, active: true },
        { id: "v4", name: "Hazel", sku: "ALC-HAZEL", minOrderQty: 4, priceDealer: 295, priceRetailer: 365, active: true }
      ]
    },
    {
      id: "p3",
      brandId: "b2",
      name: "OptiWear Monthly Toric",
      sku: "OW-MONTHLY-TORIC",
      description: "Monthly toric lens line for repeat B2B ordering.",
      thumbnailImageUrl: "",
      fullImageUrls: [],
      minOrderQty: 6,
      priceDealer: 520,
      priceRetailer: 640,
      gstRate: 12,
      active: true,
      specFieldLabels: { field1: "Power", field2: "Base Curve", field3: "Diameter" },
      variants: [
        { id: "v5", name: "Standard", sku: "OWMT-STD", minOrderQty: 6, priceDealer: 520, priceRetailer: 640, active: true },
        { id: "v6", name: "Premium", sku: "OWMT-PREM", minOrderQty: 6, priceDealer: 610, priceRetailer: 745, active: true }
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
        item("p1", "v1", "AquaLux", "AquaLux Daily Clear", "30 Lens Pack", "-2.00", "8.6", "14.2", 12, 245, 12),
        item("p2", "v3", "AquaLux", "AquaLux Color", "Blue", "-1.50", "8.7", "14.0", 4, 295, 12)
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
  ]
};

seed.orders = seed.orders.map(withTotals);

let state = clone(seed);
let remoteSaveTimer = null;

function item(productId, variantId, brand, productName, variantName, power, baseCurve, diameter, quantity, unitPrice, gstRate) {
  return {
    lineItemId: "li-" + Math.random().toString(36).slice(2, 9),
    productId,
    variantId,
    brand,
    productName,
    variantName,
    specifications: { power, baseCurve, diameter },
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

async function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const localState = (() => {
    if (!raw) return clone(seed);
    try {
      return { ...clone(seed), ...JSON.parse(raw) };
    } catch {
      return clone(seed);
    }
  })();
  if (!API_BASE_URL) return localState;
  try {
    const remoteState = await apiRequest("/api/state");
    return { ...clone(seed), ...remoteState };
  } catch (error) {
    console.warn("Using local state because the API is unavailable.", error);
    return localState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueRemoteSave();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json();
}

function queueRemoteSave() {
  if (!API_BASE_URL) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(() => {
    apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ state: sanitizeStateForPersistence(state) })
    }).catch((error) => console.warn("Unable to sync state to API.", error));
  }, 250);
}

function sanitizeStateForPersistence(value) {
  const next = clone(value);
  next.session = null;
  next.view = "login";
  next.activeOrderId = null;
  next.activeCustomerId = null;
  next.selectedProductId = null;
  next.editingProductId = null;
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
        ["reports", "Reports"],
        ["notifications", "Notifications"],
        ["admin-users", "Admin Users"]
      ]
    : [
        ["customer-dashboard", "Dashboard"],
        ["catalog", "Product Catalog"],
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
          <div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>
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
    reports: reportsView,
    notifications: notificationsView,
    "admin-users": adminUsersView,
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
        ${field("email", "Email", true, "admin@lensflow.local", "email")}
        ${field("password", "Password", true, "demo", "password")}
      </div>
      <button class="button">Sign in</button>
      <div class="notice">
        Demo accounts: admin@lensflow.local, dealer@lensflow.local, retailer@lensflow.local. Any password works in this static prototype.
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

function field(name, label, required, value = "", type = "text") {
  return `<div class="field"><label>${escapeHtml(label)}</label><input type="${type}" name="${name}" value="${escapeAttr(value)}" ${required ? "required" : ""}></div>`;
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
  const input = document.querySelector('input[name="email"]');
  if (input) input.value = email;
}

function loginWithAccount(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const email = String(data.email || "").trim().toLowerCase();
  const admin = state.adminUsers.find((entry) => entry.email.toLowerCase() === email);
  if (admin) {
    setState({ session: { role: "admin", userId: admin.id, name: admin.name, email: admin.email }, view: "dashboard" });
    return;
  }
  const customer = state.customers.find((entry) => entry.email.toLowerCase() === email);
  if (!customer) {
    alert("No account found for that email.");
    return;
  }
  if (customer.status !== "Approved") {
    alert(`This account is ${customer.status}. Admin approval is required before login.`);
    return;
  }
  if (!customer.type) {
    alert("This account has not been assigned as a dealer or retailer yet.");
    return;
  }
  setState({ session: { role: "customer", customerId: customer.id, name: customer.name, customerType: customer.type, email: customer.email }, view: "customer-dashboard" });
}

function logout() {
  setState({ session: null, view: "login", activeOrderId: null, activeCustomerId: null, selectedProductId: null });
}

function go(view) {
  setState({ view, activeOrderId: null, activeCustomerId: null });
}

function registerCustomer(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const address = { line1: data.line1, line2: data.line2, city: data.city, state: data.state, pincode: data.pincode };
  state.customers.push({
    id: "c" + Date.now(),
    type: "",
    status: "PendingApproval",
    name: data.name,
    contactPerson: data.contactPerson,
    phone: data.phone,
    email: data.email,
    gstin: data.gstin,
    billingAddress: address,
    shippingAddress: clone(address),
    notificationPreferences: { email: true, sms: false, whatsapp: true }
  });
  saveState();
  alert("Registration submitted. Admin approval is required before login and ordering.");
  setState({ view: "login" });
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
      ${metric("Active products", state.products.filter((p) => p.active).length, "Across ${state.brands.length} brands")}
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
          <td><strong>${order.orderNumber}</strong><br>${order.isEdited ? `<span class="badge warn">Edited</span>` : ""}</td>
          <td>${customer?.name || "Customer"}<br><span class="badge">${order.customerType}</span></td>
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
          <div><h2>${order.orderNumber} ${order.isEdited ? `<span class="badge warn">Edited</span>` : ""}</h2><p>${customer.name} - ${customer.type}</p></div>
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
        <div class="panel"><div class="section-title"><h3>Status history</h3></div><div class="timeline">${order.statusHistory.map((entry) => `<div class="timeline-item"><strong>${entry.status}</strong><span>${date(entry.changedAt)}</span></div>`).join("")}</div></div>
        <div class="panel"><div class="section-title"><h3>Version history</h3></div>${order.orderHistory?.length ? `<div class="timeline">${order.orderHistory.map((entry) => `<div class="timeline-item"><strong>Version ${entry.versionNumber}</strong><span>${date(entry.editedAt)} by ${entry.editedBy}</span><p>${entry.reason || entry.summary || "Order edited."}</p></div>`).join("")}</div>` : `<div class="empty">No edits recorded.</div>`}</div>
      </aside>
    </div>`, title, "Order number, line items, totals, lifecycle and audit history.", `<button class="button secondary" onclick="go('${back}')">Back</button>`);
}

function lineItemsTable(order) {
  return `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Variant</th><th>Specifications</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>
    ${order.lineItems.map((line) => `<tr><td>${line.productName}<br><span class="badge">${line.brand}</span></td><td>${line.variantName}</td><td>Power ${line.specifications.power}<br>BC ${line.specifications.baseCurve}<br>Dia ${line.specifications.diameter}</td><td>${line.quantity}</td><td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td></tr>`).join("")}
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
    <tr><td>${line.productName}</td><td>${line.variantName}</td><td>${line.specifications.power}, ${line.specifications.baseCurve}, ${line.specifications.diameter}</td><td>${line.quantity}</td>${isInvoice ? `<td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td>` : ""}</tr>`).join("");
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>${isInvoice ? "Invoice" : "Shipping Label"} ${order.orderNumber}</title><link rel="stylesheet" href="./styles.css"></head>
    <body style="padding:28px;background:white">
      <div class="section-title"><div><h1>${isInvoice ? "Invoice" : "Shipping Label"}</h1><p>${order.orderNumber} - ${date(order.createdAt)}</p></div><span class="badge">${order.status}</span></div>
      <section class="panel" style="box-shadow:none">
        <h3>${isInvoice ? "Billing address" : "Ship to"}</h3>
        <p><strong>${customer.name}</strong><br>${customer.contactPerson}<br>${isInvoice ? address(customer.billingAddress) : address(customer.shippingAddress)}<br>Phone: ${customer.phone}${isInvoice ? `<br>GSTIN: ${customer.gstin}` : ""}</p>
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
      ${state.customers.map((c) => `<tr><td><strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.contactPerson)}</td><td>${customerTypeLabel(c)}</td><td><span class="badge ${statusTone[c.status] || ""}">${c.status}</span></td><td>${escapeHtml(c.email)}<br>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.gstin)}</td><td class="row-actions"><button class="button secondary" onclick="openCustomer('${c.id}')">Open</button>${c.status === "Approved" ? `<button class="button bad" onclick="setCustomerStatus('${c.id}','Suspended')">Suspend</button>` : ""}</td></tr>`).join("")}
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
        <button class="button bad" onclick="setCustomerStatus('${customer.id}','Suspended')">Suspend</button>
      </div>
    </aside>`;
  return shell(`
    <div class="split">
      <section class="panel grid">
        <div class="section-title">
          <div><h2>${escapeHtml(customer.name)}</h2><p>${escapeHtml(customer.contactPerson)} - <span class="badge ${statusTone[customer.status] || ""}">${customer.status}</span></p></div>
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

function productTable() {
  return `<div class="table-wrap"><table><thead><tr><th>Image</th><th>Brand</th><th>Product</th><th>Variants</th><th>Dealer</th><th>Retailer</th><th>MOQ</th><th>GST</th><th>Action</th></tr></thead><tbody>
    ${state.products.map((p, index) => `<tr>
      <td><div class="thumb-mini" style="${productImageStyle(p, index)}"></div></td>
      <td>${brandName(p.brandId)}</td>
      <td><strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.sku)}<br><span class="badge ${p.active ? "ok" : "bad"}">${p.active ? "Active" : "Inactive"}</span></td>
      <td>${p.variants.map((v) => `${escapeHtml(v.name)} (${escapeHtml(v.sku)})`).join("<br>")}</td>
      <td>${money(p.priceDealer)}</td>
      <td>${money(p.priceRetailer)}</td>
      <td>${p.minOrderQty}</td>
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
  return shell(`
    <form class="grid" onsubmit="saveProduct(event, '${productId}')">
      <section class="panel">
        <div class="section-title"><div><h2>${isNew ? "Add product" : "Edit product"}</h2><p>Product details, images, pricing, MOQ, GST and specification labels.</p></div></div>
        <div class="grid two">
          <div class="field"><label>Brand</label><select name="brandId">${state.brands.map((brand) => `<option value="${brand.id}" ${brand.id === p.brandId ? "selected" : ""}>${escapeHtml(brand.name)}</option>`).join("")}</select></div>
          ${field("name", "Product name", true, p.name)}
          ${field("sku", "SKU", true, p.sku)}
          ${field("minOrderQty", "Minimum order quantity", true, p.minOrderQty, "number")}
          ${field("priceDealer", "Dealer price", true, p.priceDealer, "number")}
          ${field("priceRetailer", "Retailer price", true, p.priceRetailer, "number")}
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

      <section class="panel">
        <div class="section-title"><div><h2>Specification labels</h2><p>Defaults match Power, Base Curve and Diameter but can be changed per product.</p></div></div>
        <div class="grid three">
          ${field("specField1", "Field 1", true, p.specFieldLabels.field1)}
          ${field("specField2", "Field 2", true, p.specFieldLabels.field2)}
          ${field("specField3", "Field 3", true, p.specFieldLabels.field3)}
        </div>
      </section>

      <section class="panel">
        <div class="section-title"><div><h2>Variants</h2><p>Add up to three variants here; blank variant names are ignored.</p></div></div>
        <div class="grid">
          ${variantEditorRows(p)}
        </div>
      </section>

      <div class="row-actions">
        <button class="button">Save product</button>
        <button type="button" class="button secondary" onclick="setState({editingProductId:null})">Cancel</button>
      </div>
    </form>`, "Catalog Management", isNew ? "Create a new catalog item." : "Edit the selected catalog item.");
}

function blankProduct() {
  return {
    id: "",
    brandId: state.brands[0]?.id || "",
    name: "",
    sku: "",
    description: "",
    thumbnailImageUrl: "",
    fullImageUrls: [],
    minOrderQty: 6,
    priceDealer: 0,
    priceRetailer: 0,
    gstRate: 12,
    active: true,
    specFieldLabels: { field1: "Power", field2: "Base Curve", field3: "Diameter" },
    variants: [{ id: "", name: "Standard", sku: "", minOrderQty: 6, priceDealer: 0, priceRetailer: 0, active: true }]
  };
}

function normalizeProduct(product) {
  return {
    ...product,
    thumbnailImageUrl: product.thumbnailImageUrl || "",
    fullImageUrls: product.fullImageUrls || [],
    specFieldLabels: product.specFieldLabels || { field1: "Power", field2: "Base Curve", field3: "Diameter" },
    variants: product.variants?.length ? product.variants : [{ id: "", name: "Standard", sku: "", minOrderQty: product.minOrderQty, priceDealer: product.priceDealer, priceRetailer: product.priceRetailer, active: true }]
  };
}

function variantEditorRows(product) {
  const rows = [...product.variants];
  while (rows.length < 3) rows.push({ id: "", name: "", sku: "", minOrderQty: product.minOrderQty, priceDealer: product.priceDealer, priceRetailer: product.priceRetailer, active: true });
  return rows.slice(0, 3).map((variant, index) => `
    <div class="variant-row">
      <input type="hidden" name="variantId${index}" value="${escapeAttr(variant.id || "")}">
      ${field(`variantName${index}`, `Variant ${index + 1} name`, index === 0, variant.name)}
      ${field(`variantSku${index}`, "Variant SKU", index === 0, variant.sku)}
      ${field(`variantMoq${index}`, "Variant MOQ", false, variant.minOrderQty, "number")}
      ${field(`variantDealer${index}`, "Dealer price", false, variant.priceDealer, "number")}
      ${field(`variantRetailer${index}`, "Retailer price", false, variant.priceRetailer, "number")}
      <div class="field"><label>Variant status</label><select name="variantActive${index}"><option value="true" ${variant.active !== false ? "selected" : ""}>Active</option><option value="false" ${variant.active === false ? "selected" : ""}>Inactive</option></select></div>
    </div>`).join("");
}

function saveProduct(event, productId) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const variants = [0, 1, 2].map((index) => ({
    id: data[`variantId${index}`] || "v" + Date.now() + index,
    name: String(data[`variantName${index}`] || "").trim(),
    sku: String(data[`variantSku${index}`] || "").trim(),
    minOrderQty: Number(data[`variantMoq${index}`] || data.minOrderQty),
    priceDealer: Number(data[`variantDealer${index}`] || data.priceDealer),
    priceRetailer: Number(data[`variantRetailer${index}`] || data.priceRetailer),
    active: data[`variantActive${index}`] === "true"
  })).filter((variant) => variant.name);
  const product = {
    id: productId === "new" ? "p" + Date.now() : productId,
    brandId: data.brandId,
    name: String(data.name || "").trim(),
    sku: String(data.sku || "").trim(),
    description: String(data.description || "").trim(),
    thumbnailImageUrl: String(data.thumbnailImageUrl || "").trim(),
    fullImageUrls: String(data.fullImageUrls || "").split("\n").map((url) => url.trim()).filter(Boolean),
    minOrderQty: Number(data.minOrderQty),
    priceDealer: Number(data.priceDealer),
    priceRetailer: Number(data.priceRetailer),
    gstRate: Number(data.gstRate),
    active: data.active === "true",
    specFieldLabels: { field1: data.specField1, field2: data.specField2, field3: data.specField3 },
    variants: variants.length ? variants : [{ id: "v" + Date.now(), name: "Standard", sku: data.sku + "-STD", minOrderQty: Number(data.minOrderQty), priceDealer: Number(data.priceDealer), priceRetailer: Number(data.priceRetailer), active: true }]
  };
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
  return `background-image:url('${String(url).replaceAll("'", "%27")}')`;
}

function galleryPreview(urls) {
  if (!urls.length) return `<div class="empty">No gallery images added yet.</div>`;
  return urls.map((url) => `<div class="gallery-thumb" style="background-image:url('${String(url).replaceAll("'", "%27")}')"></div>`).join("");
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
  const csv = ["Brand,Product Name,Variant,Price Dealer,Price Retailer,Min Order Qty,GST Rate,SKU"].concat(state.products.flatMap((p) => p.variants.map((v) => `${brandName(p.brandId)},${p.name},${v.name},${v.priceDealer || p.priceDealer},${v.priceRetailer || p.priceRetailer},${v.minOrderQty || p.minOrderQty},${p.gstRate},${v.sku}`))).join("\n");
  download("products-export.csv", csv);
}

function reportsView() {
  const salesByCustomer = state.customers.map((c) => ({ c, orders: state.orders.filter((o) => o.customerId === c.id && o.status !== "Cancelled") })).filter((row) => row.orders.length);
  const top = {};
  state.orders.forEach((o) => o.lineItems.forEach((line) => {
    top[line.productName] = top[line.productName] || { qty: 0, revenue: 0 };
    top[line.productName].qty += line.quantity;
    top[line.productName].revenue += line.lineTotal;
  }));
  return shell(`
    <div class="grid two">
      <section class="panel"><div class="section-title"><h2>Sales by dealer/retailer</h2></div><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Orders</th><th>Total</th></tr></thead><tbody>${salesByCustomer.map((row) => `<tr><td>${row.c.name}</td><td>${row.orders.length}</td><td>${money(row.orders.reduce((sum, o) => sum + o.grandTotal, 0))}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel"><div class="section-title"><h2>Top products</h2></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>${Object.entries(top).map(([name, val]) => `<tr><td>${name}</td><td>${val.qty}</td><td>${money(val.revenue)}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel">${pendingOrdersTable()}</section>
      <section class="panel"><div class="section-title"><h2>Order aging</h2></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Status</th><th>Open days</th></tr></thead><tbody>${state.orders.filter((o) => !["Closed", "Cancelled"].includes(o.status)).map((o) => `<tr><td>${o.orderNumber}</td><td>${o.status}</td><td>${Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 86400000))}</td></tr>`).join("")}</tbody></table></div></section>
    </div>`, "Reports", "Sales, pending orders, aging and best-selling products.");
}

function notificationsView() {
  return shell(`
    <section class="panel">
      <div class="section-title"><div><h2>Notification settings</h2><p>Configure channels independently by event and recipient.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Event</th><th>Email</th><th>SMS</th><th>WhatsApp</th><th>Recipient</th></tr></thead><tbody>
        ${state.notificationSettings.map((n, index) => `<tr><td>${n.event}</td>${["email","sms","whatsapp"].map((ch) => `<td><input type="checkbox" ${n.channelsEnabled[ch] ? "checked" : ""} onchange="toggleChannel(${index}, '${ch}', this.checked)"></td>`).join("")}<td><select onchange="setRecipient(${index}, this.value)"><option ${n.recipient === "customer" ? "selected" : ""}>customer</option><option ${n.recipient === "admin" ? "selected" : ""}>admin</option><option ${n.recipient === "both" ? "selected" : ""}>both</option></select></td></tr>`).join("")}
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
  return shell(`
    <section class="panel">
      <div class="section-title"><div><h2>Admin users</h2><p>Super Admin can create and remove staff accounts.</p></div><button class="button" onclick="addAdminUser()">Add admin user</button></div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>${state.adminUsers.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.role === "Super Admin" ? "" : `<button class="button bad" onclick="removeAdminUser('${u.id}')">Remove</button>`}</td></tr>`).join("")}</tbody></table></div>
    </section>`, "Admin User Management", "Single staff permission tier plus Super Admin ownership.");
}

function addAdminUser() {
  state.adminUsers.push({ id: "a" + Date.now(), name: "New Staff User", email: `staff${Date.now()}@lensflow.local`, role: "Admin User" });
  saveState();
  render();
}

function removeAdminUser(id) {
  state.adminUsers = state.adminUsers.filter((u) => u.id !== id);
  saveState();
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

function catalogView() {
  const customer = currentCustomer();
  if (state.selectedProductId) return productDetail(state.selectedProductId);
  const content = `
    <div class="grid three">
      ${state.products.filter((p) => p.active).map((p, index) => `
        <article class="card catalog-card">
          <div class="product-art ${index % 2 ? "alt" : ""}" style="${productImageStyle(p, index)}"></div>
          <div class="catalog-body">
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            <div class="row-actions">
              <span class="badge">${brandName(p.brandId)}</span>
              <span class="badge">MOQ ${p.minOrderQty}</span>
              <span class="badge ok">${money(customer.type === "dealer" ? p.priceDealer : p.priceRetailer)}</span>
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
  const customer = currentCustomer();
  const priceFor = (variant) => customer.type === "dealer" ? (variant.priceDealer || p.priceDealer) : (variant.priceRetailer || p.priceRetailer);
  const gallery = [p.thumbnailImageUrl, ...(p.fullImageUrls || [])].filter(Boolean);
  return shell(`
    <div class="split">
      <section class="panel">
        <div class="product-art" style="border-radius:8px;min-height:260px;margin-bottom:14px;${productImageStyle(p, 0)}"></div>
        ${gallery.length ? `<div class="gallery-strip" style="margin-bottom:14px">${galleryPreview(gallery)}</div>` : ""}
        <div class="section-title"><div><h2>${p.name}</h2><p>${p.description}</p></div><span class="badge">${brandName(p.brandId)}</span></div>
        <div class="grid two">
          ${p.variants.map((v) => `<div class="line-item"><strong>${v.name}</strong><span>${v.sku}</span><span class="badge ok">${money(priceFor(v))}</span><span class="badge">MOQ ${v.minOrderQty || p.minOrderQty}</span></div>`).join("")}
        </div>
      </section>
      <aside class="panel">
        <form class="grid" onsubmit="addToCart(event, '${p.id}')">
          <div class="section-title"><h3>Add specification line</h3></div>
          <div class="field"><label>Variant</label><select name="variantId">${p.variants.map((v) => `<option value="${v.id}">${v.name} - ${money(priceFor(v))}</option>`).join("")}</select></div>
          ${field("power", p.specFieldLabels.field1, true)}
          ${field("baseCurve", p.specFieldLabels.field2, true, "8.6")}
          ${field("diameter", p.specFieldLabels.field3, true, "14.2")}
          ${field("quantity", "Quantity", true, p.minOrderQty, "number")}
          <button class="button">Add to cart</button>
        </form>
      </aside>
    </div>`, "Product Detail", "Free-text specifications with quantity per combination.", `<button class="button secondary" onclick="setState({selectedProductId:null})">Back</button>`);
}

function addToCart(event, productId) {
  event.preventDefault();
  const customer = currentCustomer();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const product = byId(state.products, productId);
  const variant = product.variants.find((v) => v.id === data.variantId);
  const min = Number(variant.minOrderQty || product.minOrderQty);
  const quantity = Number(data.quantity);
  if (quantity < min) {
    alert(`Minimum order quantity for this variant is ${min}.`);
    return;
  }
  const unitPrice = customer.type === "dealer" ? (variant.priceDealer || product.priceDealer) : (variant.priceRetailer || product.priceRetailer);
  state.cart.push(item(product.id, variant.id, brandName(product.brandId), product.name, variant.name, data.power, data.baseCurve, data.diameter, quantity, unitPrice, product.gstRate));
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

function submitOrder() {
  const customer = currentCustomer();
  const order = withTotals({
    id: "o" + Date.now(),
    orderNumber: "ORD-2026-" + String(state.orders.length + 124).padStart(6, "0"),
    customerId: customer.id,
    customerType: customer.type,
    status: "Order Received",
    isEdited: false,
    currentVersion: 1,
    billingAddress: clone(customer.billingAddress),
    shippingAddress: clone(customer.shippingAddress),
    lineItems: clone(state.cart),
    notes: "",
    createdBy: customer.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [history("Order Received", customer.id, new Date().toISOString())],
    orderHistory: [],
    invoiceGenerated: false,
    shippingLabelGenerated: false
  });
  state.orders.unshift(order);
  state.cart = [];
  saveState();
  setState({ view: "my-orders", activeOrderId: order.id });
}

function myOrdersView() {
  if (state.activeOrderId) return orderDetail(state.activeOrderId, false);
  return shell(`<section class="panel">${ordersTable(orderForCustomer(), false)}</section>`, "My Orders", "Track submitted orders and view invoice-ready detail.");
}

function profileView() {
  const c = currentCustomer();
  return shell(`
    <section class="panel grid">
      <div class="section-title"><div><h2>${c.name}</h2><p>${c.type} account - <span class="badge ${statusTone[c.status]}">${c.status}</span></p></div></div>
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

function setPref(channel, checked) {
  currentCustomer().notificationPreferences[channel] = checked;
  saveState();
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
  state = await loadState();
  render();
}

initialize();
