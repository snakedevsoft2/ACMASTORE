/**
 * Cálculo de totales de compra. Función pura: la usan el carrito, el checkout
 * y la creación del pedido, siempre con precios leídos de la base de datos.
 */

export type PricingLine = { unitPriceCents: number; quantity: number };

export type PricingCoupon = {
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotalCents: number | null;
};

export type PricingShipping = {
  priceCents: number;
  freeOverCents: number | null;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  /** El cupón existe pero no aplica (subtotal mínimo no alcanzado). */
  couponBelowMinimum: boolean;
};

export function computeTotals(input: {
  lines: PricingLine[];
  coupon?: PricingCoupon | null;
  shipping?: PricingShipping | null;
}): Totals {
  const subtotalCents = input.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

  let discountCents = 0;
  let couponBelowMinimum = false;
  const c = input.coupon;
  if (c) {
    if (c.minSubtotalCents != null && subtotalCents < c.minSubtotalCents) {
      couponBelowMinimum = true;
    } else if (c.type === "PERCENT") {
      const pct = Math.min(Math.max(c.value, 0), 100);
      discountCents = Math.round((subtotalCents * pct) / 100);
    } else {
      discountCents = Math.max(c.value, 0);
    }
  }
  discountCents = Math.min(discountCents, subtotalCents);

  const afterDiscount = subtotalCents - discountCents;
  let shippingCents = 0;
  const s = input.shipping;
  if (s && input.lines.length > 0) {
    const isFree = s.freeOverCents != null && afterDiscount >= s.freeOverCents;
    shippingCents = isFree ? 0 : Math.max(s.priceCents, 0);
  }

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: afterDiscount + shippingCents,
    couponBelowMinimum,
  };
}

export function effectivePrice(
  product: { priceCents: number; compareAtCents: number | null },
  variant?: { priceCents: number | null; compareAtCents: number | null } | null,
): { priceCents: number; compareAtCents: number | null } {
  const priceCents = variant?.priceCents ?? product.priceCents;
  const compareAt = variant?.priceCents != null ? variant.compareAtCents : (variant?.compareAtCents ?? product.compareAtCents);
  return { priceCents, compareAtCents: compareAt != null && compareAt > priceCents ? compareAt : null };
}
