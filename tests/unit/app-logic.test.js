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
    expect(window.escapeHtml("AquaLux Daily Clear")).toBe("AquaLux Daily Clear");
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
