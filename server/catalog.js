// Power/cyl/axis ranges are stored as segments ({ start, end, step }) rather
// than flat lists, because real lens power ranges mix signs and step sizes
// within a single product (see README catalog section). This expands a
// segment into concrete selectable values in either direction.
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

// Generates the sellable variant matrix from the axis value lists an admin
// defines (color / packSize). A product with neither axis gets one implicit
// "Standard" variant so downstream cart/order code always has a variant id.
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

// The single source of truth for what a line item costs. Used both for the
// customer-facing price preview and - authoritatively, never trusting the
// client - when an order is actually submitted (see server/index.js).
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

export {
  expandRangeSegment,
  expandRanges,
  formatPowerValue,
  isValueInRanges,
  generateVariants,
  resolveUnitPrice,
  resolveMinOrderQty
};
