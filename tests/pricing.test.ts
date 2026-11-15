import { describe, expect, it } from "vitest";
import { computeTotals, effectivePrice } from "@/lib/pricing";

const lines = [
  { unitPriceCents: 50_000_00, quantity: 2 },
  { unitPriceCents: 19_900_00, quantity: 1 },
];

describe("computeTotals", () => {
  it("suma subtotal y envío sin cupón", () => {
    const t = computeTotals({ lines, shipping: { priceCents: 12_000_00, freeOverCents: null } });
    expect(t.subtotalCents).toBe(119_900_00);
    expect(t.discountCents).toBe(0);
    expect(t.shippingCents).toBe(12_000_00);
    expect(t.totalCents).toBe(131_900_00);
  });

  it("aplica cupón porcentual con redondeo", () => {
    const t = computeTotals({
      lines: [{ unitPriceCents: 999, quantity: 1 }],
      coupon: { type: "PERCENT", value: 15, minSubtotalCents: null },
    });
    expect(t.discountCents).toBe(150); // 149.85 → 150
    expect(t.totalCents).toBe(849);
  });

  it("el descuento fijo nunca supera el subtotal", () => {
    const t = computeTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      coupon: { type: "FIXED", value: 5000, minSubtotalCents: null },
    });
    expect(t.discountCents).toBe(1000);
    expect(t.totalCents).toBe(0);
  });

  it("no aplica cupón bajo el mínimo", () => {
    const t = computeTotals({
      lines: [{ unitPriceCents: 1000, quantity: 1 }],
      coupon: { type: "PERCENT", value: 50, minSubtotalCents: 2000 },
    });
    expect(t.discountCents).toBe(0);
    expect(t.couponBelowMinimum).toBe(true);
  });

  it("envío gratis según subtotal con descuento aplicado", () => {
    const shipping = { priceCents: 500, freeOverCents: 10_000 };
    const exact = computeTotals({ lines: [{ unitPriceCents: 10_000, quantity: 1 }], shipping });
    expect(exact.shippingCents).toBe(0);
    const discounted = computeTotals({
      lines: [{ unitPriceCents: 10_000, quantity: 1 }],
      coupon: { type: "FIXED", value: 1, minSubtotalCents: null },
      shipping,
    });
    expect(discounted.shippingCents).toBe(500);
  });

  it("carrito vacío no cobra envío", () => {
    const t = computeTotals({ lines: [], shipping: { priceCents: 500, freeOverCents: null } });
    expect(t.totalCents).toBe(0);
  });
});

describe("effectivePrice", () => {
  const product = { priceCents: 10_000, compareAtCents: 12_000 };
  it("usa precio del producto si la variante no tiene precio", () => {
    expect(effectivePrice(product, { priceCents: null, compareAtCents: null })).toEqual({
      priceCents: 10_000,
      compareAtCents: 12_000,
    });
  });
  it("usa precio propio de la variante", () => {
    expect(effectivePrice(product, { priceCents: 11_000, compareAtCents: null })).toEqual({
      priceCents: 11_000,
      compareAtCents: null,
    });
  });
  it("ignora un precio anterior menor o igual al precio", () => {
    expect(effectivePrice({ priceCents: 10_000, compareAtCents: 9_000 })).toEqual({
      priceCents: 10_000,
      compareAtCents: null,
    });
  });
});
