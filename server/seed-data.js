import bcrypt from "bcryptjs";

// Demo-only credentials, documented in README. Real self-registrations hash
// whatever password the user actually chose (see /api/customer-actions/register).
const DEMO_PASSWORDS = {
  "admin@lensflow.local": "admin123",
  "ops@lensflow.local": "ops123",
  "dealer@lensflow.local": "dealer123",
  "retailer@lensflow.local": "retailer123",
  "north@example.com": "north123"
};

function demoPasswordHash(email) {
  return bcrypt.hashSync(DEMO_PASSWORDS[email], 10);
}

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

// A product's category decides which optical-parameter blocks apply - not
// every lens has a prescription (plano/cosmetic), and only toric lenses need
// cylinder power + axis on top of sphere power. Variant axes (color/pack
// size) and pricing mode (flat/tiered) are per-product choices, independent
// of category.
const CATEGORIES = [
  { id: "cat-optical-sphere", name: "Optical Lens - Sphere Power", hasOpticalParameters: true, hasCylAxis: false },
  { id: "cat-optical-toric", name: "Optical Lens - Toric (Sphere + Cyl + Axis)", hasOpticalParameters: true, hasCylAxis: true },
  { id: "cat-plano", name: "Plano / Cosmetic (No Power)", hasOpticalParameters: false, hasCylAxis: false }
];

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

function withTotals(order) {
  const lineItems = order.lineItems.map((line) => ({ ...line, lineTotal: line.quantity * line.unitPrice }));
  const subTotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const gstAmount = lineItems.reduce((sum, line) => sum + line.lineTotal * ((line.gstRate || 12) / 100), 0);
  return { ...order, lineItems, subTotal, gstAmount, grandTotal: subTotal + gstAmount, gstRate: 12 };
}

const seedState = {
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
    { id: "a1", name: "Super Admin", email: "admin@lensflow.local", role: "Super Admin", passwordHash: demoPasswordHash("admin@lensflow.local") },
    { id: "a2", name: "Operations Staff", email: "ops@lensflow.local", role: "Admin User", passwordHash: demoPasswordHash("ops@lensflow.local") }
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
      passwordHash: demoPasswordHash("dealer@lensflow.local"),
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
      passwordHash: demoPasswordHash("retailer@lensflow.local"),
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
      passwordHash: demoPasswordHash("north@example.com"),
      gstin: "07NORTH1234P1Z9",
      billingAddress: { line1: "Plot 18", line2: "Industrial Area", city: "Delhi", state: "Delhi", pincode: "110020" },
      shippingAddress: { line1: "Plot 18", line2: "Industrial Area", city: "Delhi", state: "Delhi", pincode: "110020" },
      notificationPreferences: { email: true, sms: false, whatsapp: true }
    }
  ],
  brands: [
    { id: "b1", name: "Aura NetraLens", active: true }
  ],
  categories: CATEGORIES,
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
      pricing: {
        mode: "flat",
        flat: { mrp: 310, priceDealer: 245, priceRetailer: 310, minOrderQty: 6 },
        tiers: []
      },
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
      pricing: {
        mode: "flat",
        flat: { mrp: 365, priceDealer: 295, priceRetailer: 365, minOrderQty: 4 },
        tiers: []
      },
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
      pricing: {
        mode: "flat",
        flat: { mrp: 640, priceDealer: 520, priceRetailer: 640, minOrderQty: 6 },
        tiers: []
      },
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
    withTotals({
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
    })
  ],
  notificationSettings: [
    { event: "Order Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "both" },
    { event: "Payment Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "customer" },
    { event: "Order Dispatched", channelsEnabled: { email: true, sms: true, whatsapp: true }, recipient: "customer" },
    { event: "NewDealerRegistration", channelsEnabled: { email: true, sms: false, whatsapp: false }, recipient: "admin" }
  ]
};

export { STATUSES, CATEGORIES, seedState };
