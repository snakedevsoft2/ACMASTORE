import "server-only";
import type { Coupon } from "@prisma/client";
import { db } from "@/lib/db";

export type CouponCheck = { coupon: Coupon; error: null } | { coupon: null; error: string };

/** Valida un cupón contra fechas, usos y subtotal mínimo. */
export function checkCoupon(coupon: Coupon | null, subtotalCents: number, now = new Date()): CouponCheck {
  if (!coupon || !coupon.isActive) return { coupon: null, error: "El cupón no existe o no está activo." };
  if (coupon.startsAt && coupon.startsAt > now) return { coupon: null, error: "El cupón aún no está vigente." };
  if (coupon.endsAt && coupon.endsAt < now) return { coupon: null, error: "El cupón ha expirado." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { coupon: null, error: "El cupón alcanzó su límite de usos." };
  }
  if (coupon.minSubtotalCents != null && subtotalCents < coupon.minSubtotalCents) {
    return { coupon: null, error: "Tu compra no alcanza el mínimo requerido para este cupón." };
  }
  return { coupon, error: null };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export async function findCoupon(code: string, subtotalCents: number): Promise<CouponCheck> {
  const coupon = await db.coupon.findUnique({ where: { code: normalizeCouponCode(code) } });
  return checkCoupon(coupon, subtotalCents);
}
