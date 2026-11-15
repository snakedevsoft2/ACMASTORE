import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Coupon } from "@prisma/client";
import { checkCoupon, normalizeCouponCode } from "@/lib/coupons";
import { verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";
import { fromStripeAmount, toStripeAmount } from "@/lib/payments/stripe";

const base: Coupon = {
  id: "c1",
  code: "ACMA10",
  description: null,
  type: "PERCENT",
  value: 10,
  minSubtotalCents: null,
  maxUses: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("checkCoupon", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  it("acepta un cupón vigente", () => {
    expect(checkCoupon(base, 1000, now).error).toBeNull();
  });
  it("rechaza inexistente o inactivo", () => {
    expect(checkCoupon(null, 1000, now).error).toBeTruthy();
    expect(checkCoupon({ ...base, isActive: false }, 1000, now).error).toBeTruthy();
  });
  it("respeta fechas", () => {
    expect(checkCoupon({ ...base, startsAt: new Date("2026-07-01") }, 1000, now).error).toMatch(/vigente/);
    expect(checkCoupon({ ...base, endsAt: new Date("2026-05-01") }, 1000, now).error).toMatch(/expirado/);
  });
  it("respeta usos y mínimo", () => {
    expect(checkCoupon({ ...base, maxUses: 5, usedCount: 5 }, 1000, now).error).toMatch(/límite/);
    expect(checkCoupon({ ...base, minSubtotalCents: 5000 }, 1000, now).error).toMatch(/mínimo/);
  });
  it("normaliza el código", () => {
    expect(normalizeCouponCode("  acma 10 ")).toBe("ACMA10");
  });
});

describe("firma de webhook Mercado Pago", () => {
  const secret = "test-secret";
  const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex");

  it("valida una firma correcta", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: `ts=1700000000,v1=${v1}`,
        requestId: "req-1",
        dataId: "123456",
        secret,
      }),
    ).toBe(true);
  });
  it("rechaza firma alterada o ausente", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1700000000;");
    expect(
      verifyMercadoPagoSignature({ signatureHeader: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "999", secret }),
    ).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: null, requestId: "req-1", dataId: "123456", secret })).toBe(false);
  });
});

describe("importes Stripe", () => {
  it("COP y USD usan centavos; CLP no", () => {
    expect(toStripeAmount(8_990_000, "COP")).toBe(8_990_000);
    expect(toStripeAmount(1999, "usd")).toBe(1999);
    expect(toStripeAmount(1_000_000, "CLP")).toBe(10_000);
    expect(fromStripeAmount(10_000, "CLP")).toBe(1_000_000);
  });
});
