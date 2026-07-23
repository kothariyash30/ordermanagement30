import { describe, test, expect } from "vitest";
import { loadApp } from "../support/loadApp.js";

describe("money formatting", () => {
  test("formats a numeric amount with the Rs prefix and en-IN grouping", async () => {
    const window = await loadApp();
    const expected = "Rs " + (123456.5).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    expect(window.money(123456.5)).toBe(expected);
  });

  test("treats missing/undefined values as zero", async () => {
    const window = await loadApp();
    expect(window.money(undefined)).toBe("Rs 0");
  });
});

describe("HTML escaping", () => {
  test("escapeHtml neutralizes angle brackets and ampersands", async () => {
    const window = await loadApp();
    expect(window.escapeHtml("<script>alert(1)</script> & co")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co"
    );
  });

  test("escapeAttr additionally neutralizes double quotes for attribute contexts", async () => {
    const window = await loadApp();
    expect(window.escapeAttr('x" onmouseover="alert(1)')).toBe("x&quot; onmouseover=&quot;alert(1)");
  });

  test("both helpers pass through plain text unchanged", async () => {
    const window = await loadApp();
    expect(window.escapeHtml("Aura NetraLens Daily Clear")).toBe("Aura NetraLens Daily Clear");
  });
});

describe("byId lookup", () => {
  test("finds an entry by id", async () => {
    const window = await loadApp();
    const list = [{ id: "a", name: "First" }, { id: "b", name: "Second" }];
    expect(window.byId(list, "b")).toEqual({ id: "b", name: "Second" });
  });

  test("returns undefined when no entry matches", async () => {
    const window = await loadApp();
    expect(window.byId([{ id: "a" }], "missing")).toBeUndefined();
  });
});

describe("withTotals (order pricing)", () => {
  test("computes subtotal, GST and grand total from line items", async () => {
    const window = await loadApp();
    const order = window.withTotals({
      lineItems: [
        { quantity: 2, unitPrice: 100, gstRate: 12 },
        { quantity: 1, unitPrice: 50, gstRate: 12 }
      ]
    });
    expect(order.subTotal).toBe(250);
    expect(order.gstAmount).toBeCloseTo(30, 5);
    expect(order.grandTotal).toBeCloseTo(280, 5);
  });

  test("defaults to a 12% GST rate when a line item omits gstRate", async () => {
    const window = await loadApp();
    const order = window.withTotals({ lineItems: [{ quantity: 1, unitPrice: 100 }] });
    expect(order.gstAmount).toBeCloseTo(12, 5);
  });

  test("recomputes lineTotal from quantity * unitPrice rather than trusting stale input", async () => {
    const window = await loadApp();
    const order = window.withTotals({
      lineItems: [{ quantity: 3, unitPrice: 10, gstRate: 0, lineTotal: 999 }]
    });
    expect(order.lineItems[0].lineTotal).toBe(30);
  });
});

describe("expandRanges (power/cyl/axis segment expansion)", () => {
  test("expands a single descending segment", async () => {
    const window = await loadApp();
    expect(window.expandRanges([{ start: 0, end: -1.00, step: 0.25 }])).toEqual([0, -0.25, -0.50, -0.75, -1.00]);
  });

  test("expands a single ascending segment", async () => {
    const window = await loadApp();
    expect(window.expandRanges([{ start: 0.50, end: 1.50, step: 0.50 }])).toEqual([0.50, 1.00, 1.50]);
  });

  test("concatenates multiple segments with different steps and signs, matching the wide-range product spec", async () => {
    const window = await loadApp();
    const values = window.expandRanges([
      { start: -0.50, end: -1.00, step: 0.25 },
      { start: 0.50, end: 1.00, step: 0.20 }
    ]);
    expect(values).toEqual([-0.50, -0.75, -1.00, 0.50, 0.70, 0.90]);
  });

  test("returns an empty array for no segments", async () => {
    const window = await loadApp();
    expect(window.expandRanges(null)).toEqual([]);
    expect(window.expandRanges([])).toEqual([]);
  });
});

describe("formatPowerValue", () => {
  test("formats zero as Plano", async () => {
    const window = await loadApp();
    expect(window.formatPowerValue(0)).toBe("Plano");
  });

  test("formats negative and positive powers with a sign and two decimals", async () => {
    const window = await loadApp();
    expect(window.formatPowerValue(-5)).toBe("-5.00");
    expect(window.formatPowerValue(3.5)).toBe("+3.50");
  });
});

describe("isValueInRanges", () => {
  const ranges = [{ start: 0, end: -5.00, step: 0.25 }, { start: -5.50, end: -10.00, step: 0.50 }];

  test("accepts a value that falls on the step grid", async () => {
    const window = await loadApp();
    expect(window.isValueInRanges(-2.00, ranges)).toBe(true);
    expect(window.isValueInRanges(-10.00, ranges)).toBe(true);
  });

  test("rejects a value that does not fall on the step grid", async () => {
    const window = await loadApp();
    expect(window.isValueInRanges(-2.10, ranges)).toBe(false);
    expect(window.isValueInRanges(-10.25, ranges)).toBe(false);
  });

  test("treats no configured ranges as accept-anything (plano/cosmetic products)", async () => {
    const window = await loadApp();
    expect(window.isValueInRanges(999, null)).toBe(true);
  });
});

describe("generateVariants (variant axis cartesian product)", () => {
  test("generates one variant per color when only color is used", async () => {
    const window = await loadApp();
    const variants = window.generateVariants({ sku: "ALC", variantAxisValues: { color: ["Blue", "Hazel"], packSize: [] }, minOrderQty: 4 });
    expect(variants.map((v) => v.name)).toEqual(["Blue", "Hazel"]);
  });

  test("generates the cartesian product when both axes are used", async () => {
    const window = await loadApp();
    const variants = window.generateVariants({ sku: "P", variantAxisValues: { color: ["Blue", "Red"], packSize: ["Small", "Large"] }, minOrderQty: 1 });
    expect(variants.map((v) => v.name).sort()).toEqual(["Large - Blue", "Large - Red", "Small - Blue", "Small - Red"].sort());
  });

  test("falls back to a single Standard variant when neither axis is used", async () => {
    const window = await loadApp();
    const variants = window.generateVariants({ sku: "P", variantAxisValues: { color: [], packSize: [] }, minOrderQty: 1 });
    expect(variants.map((v) => v.name)).toEqual(["Standard"]);
  });
});

describe("resolveUnitPrice / resolveMinOrderQty (flat vs tiered pricing)", () => {
  test("flat pricing returns the dealer or retailer price directly", async () => {
    const window = await loadApp();
    const product = { pricing: { mode: "flat", flat: { priceDealer: 245, priceRetailer: 310 } } };
    expect(window.resolveUnitPrice(product, {}, undefined, "dealer")).toBe(245);
    expect(window.resolveUnitPrice(product, {}, undefined, "retailer")).toBe(310);
  });

  test("tiered pricing resolves a different price above/below the power threshold, matching the spec's pack+power example", async () => {
    const window = await loadApp();
    const product = {
      pricing: {
        mode: "tiered",
        tiers: [
          { match: { packSize: "1 Pair Pack", powerGte: -10.00 }, priceDealer: 650, priceRetailer: 800 },
          { match: { packSize: "1 Pair Pack", powerLte: -10.50 }, priceDealer: 800, priceRetailer: 980 },
          { match: { packSize: "3 Pair Pack", powerGte: -10.00 }, priceDealer: 1800, priceRetailer: 2200 }
        ]
      }
    };
    const onePair = { packSize: "1 Pair Pack" };
    expect(window.resolveUnitPrice(product, onePair, -10.00, "dealer")).toBe(650);
    expect(window.resolveUnitPrice(product, onePair, -10.50, "dealer")).toBe(800);
    expect(window.resolveUnitPrice(product, { packSize: "3 Pair Pack" }, -5, "retailer")).toBe(2200);
  });

  test("throws when no tier matches the selection", async () => {
    const window = await loadApp();
    const product = { pricing: { mode: "tiered", tiers: [{ match: { packSize: "1 Pair Pack", powerGte: -10.00 }, priceDealer: 1, priceRetailer: 1 }] } };
    expect(() => window.resolveUnitPrice(product, { packSize: "3 Pair Pack" }, -5, "dealer")).toThrow();
  });

  test("resolveMinOrderQty prefers a tier's own MOQ over the variant/product default", async () => {
    const window = await loadApp();
    const product = { minOrderQty: 5, pricing: { mode: "tiered", tiers: [{ match: { packSize: "1 Pair Pack", powerGte: -10.00 }, minOrderQty: 2 }] } };
    expect(window.resolveMinOrderQty(product, { packSize: "1 Pair Pack", minOrderQty: 9 }, -5)).toBe(2);
  });
});

describe("convertSpectacleRxToContactLens (mirrored client-side copy for the Vertex Calculator page)", () => {
  test("matches the server-side implementation for a sphere-only Rx", async () => {
    const window = await loadApp();
    expect(window.convertSpectacleRxToContactLens(-10)).toEqual({ sphere: -9, cyl: 0 });
  });

  test("matches the server-side implementation for a toric Rx", async () => {
    const window = await loadApp();
    expect(window.convertSpectacleRxToContactLens(-6, -2)).toEqual({ sphere: -5.5, cyl: -1.75 });
  });

  test("throws a clear error for non-finite input, same as the server-side copy", async () => {
    const window = await loadApp();
    expect(() => window.convertSpectacleRxToContactLens(NaN)).toThrow("Sphere power must be a finite number.");
  });
});

describe("orderStatusCounts (admin reports: order status queue)", () => {
  test("counts every workflow status, including zero-order statuses, from the seeded order", async () => {
    const window = await loadApp();
    const counts = window.orderStatusCounts();
    // STATUSES is a top-level const, so - like `state` - it isn't exposed on
    // window in a classic script. Assert against the fixed workflow instead.
    expect(Object.keys(counts)).toEqual([
      "Order Received", "Awaiting Payment", "Payment Received", "Order Processed",
      "Order Dispatched", "Order Delivered", "Closed", "Cancelled"
    ]);
    // Seed data has exactly one order, status "Payment Received".
    expect(counts["Payment Received"]).toBe(1);
    expect(counts["Order Received"]).toBe(0);
    expect(counts["Closed"]).toBe(0);
  });
});

describe("initial application state", () => {
  // `state` is a top-level `let` in app.js, so unlike its function
  // declarations it is not exposed as window.state in a classic script.
  // Assert against the rendered DOM instead, the same surface a user sees.
  test("boots into the login view with no active session", async () => {
    const window = await loadApp();
    const appHtml = window.document.getElementById("app").innerHTML;
    expect(appHtml).toContain("Account login");
    expect(appHtml).toContain("Sign in");
  });

  test("seeds the demo admin, dealer and retailer accounts", async () => {
    const window = await loadApp();
    const appHtml = window.document.getElementById("app").innerHTML;
    expect(appHtml).toContain("admin@lensflow.local");
    expect(appHtml).toContain("dealer@lensflow.local");
    expect(appHtml).toContain("retailer@lensflow.local");
  });
});
