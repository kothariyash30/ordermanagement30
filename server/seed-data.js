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
    })
  ],
  notificationSettings: [
    { event: "Order Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "both" },
    { event: "Payment Received", channelsEnabled: { email: true, sms: false, whatsapp: true }, recipient: "customer" },
    { event: "Order Dispatched", channelsEnabled: { email: true, sms: true, whatsapp: true }, recipient: "customer" },
    { event: "NewDealerRegistration", channelsEnabled: { email: true, sms: false, whatsapp: false }, recipient: "admin" }
  ]
};

export { STATUSES, seedState };
