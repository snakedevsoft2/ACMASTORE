import "server-only";
import type { Order, OrderStatus, PaymentProviderCode, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCart } from "@/lib/cart";
import { checkCoupon, normalizeCouponCode } from "@/lib/coupons";
import { OutOfStockError, releaseOrderStock, reserveStock } from "@/lib/inventory";
import { computeTotals } from "@/lib/pricing";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import type { SessionUser } from "@/lib/auth/session";
import { getOnlineProvider, isOnlineProvider, isProviderConfigured } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { ORDER_TRANSITIONS } from "@/lib/labels";
import { orderNumber, siteUrl } from "@/lib/utils";
import type { CheckoutInput } from "@/lib/validation";
import { notifyOrderPaid, notifyOrderPlaced, notifyOrderShipped } from "@/lib/order-emails";

type Tx = Prisma.TransactionClient;

export class OrderError extends Error {}

export function pendingOrderTtlMs(): number {
  const hours = Number(process.env.PENDING_ORDER_TTL_HOURS || 24);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600_000;
}

export function orderUrl(orderId: string, accessToken: string): string {
  return siteUrl(`/pedido/${orderId}?t=${encodeURIComponent(accessToken)}`);
}

// ─────────────────────────────── Creación del pedido ───────────────────────────────

export type PlaceOrderResult = {
  orderId: string;
  accessToken: string;
  provider: PaymentProviderCode;
  totalCents: number;
};

/**
 * Crea el pedido desde el carrito actual. Todo ocurre en una transacción:
 * uso de cupón, creación del pedido, descuento de stock y vaciado del carrito.
 * Si una variante no tiene stock suficiente, nada se guarda.
 */
export async function placeOrder(
  input: CheckoutInput,
  user: SessionUser | null,
  expectedTotalCents: number | null,
): Promise<PlaceOrderResult> {
  const cart = await getCart();
  if (!cart.id || cart.lines.length === 0) throw new OrderError("Tu carrito está vacío.");
  if (cart.hasIssues) throw new OrderError("Algunos productos de tu carrito cambiaron. Revisa el carrito.");

  const [shipping, payment, settings] = await Promise.all([
    db.shippingMethod.findFirst({ where: { id: input.shippingMethodId, isActive: true } }),
    db.paymentMethodConfig.findFirst({ where: { provider: input.paymentProvider, isActive: true } }),
    getSettings(),
  ]);
  if (!shipping) throw new OrderError("El método de envío seleccionado no está disponible.");
  if (!payment || !isProviderConfigured(payment.provider)) {
    throw new OrderError("El método de pago seleccionado no está disponible.");
  }

  let coupon = null;
  if (input.couponCode) {
    const found = await db.coupon.findUnique({ where: { code: normalizeCouponCode(input.couponCode) } });
    const check = checkCoupon(found, cart.subtotalCents);
    if (check.error) throw new OrderError(check.error);
    coupon = check.coupon;
  }

  const totals = computeTotals({
    lines: cart.lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    coupon,
    shipping,
  });
  if (expectedTotalCents != null && expectedTotalCents !== totals.totalCents) {
    throw new OrderError("Los precios o costos cambiaron mientras comprabas. Revisa el resumen y confirma de nuevo.");
  }

  const accessToken = generateToken();
  const cartId = cart.id;

  let order: Order;
  try {
    order = await db.$transaction(async (tx) => {
      if (coupon) {
        const used = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
           WHERE "id" = ${coupon.id} AND "isActive" = true
             AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
       RETURNING "id"`;
        if (used.length === 0) throw new OrderError("El cupón alcanzó su límite de usos.");
      }

      const created = await tx.order.create({
        data: {
          userId: user?.id ?? null,
          accessTokenHash: hashToken(accessToken),
          email: input.email,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          shipFullName: input.fullName,
          shipPhone: input.phone,
          shipLine1: input.line1,
          shipLine2: input.line2,
          shipCity: input.city,
          shipState: input.state,
          shipPostalCode: input.postalCode,
          shipCountry: input.country,
          shipNotes: input.notes,
          shippingMethodId: shipping.id,
          shippingMethodName: shipping.name,
          paymentProvider: payment.provider,
          paymentMethodName: payment.displayName,
          couponId: coupon?.id ?? null,
          couponCode: coupon?.code ?? null,
          currency: settings.currency,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          shippingCents: totals.shippingCents,
          totalCents: totals.totalCents,
          customerNote: input.customerNote,
          items: {
            create: cart.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              variantName: l.variantName,
              imageUrl: l.imageUrl,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              totalCents: l.lineTotalCents,
            })),
          },
          history: {
            create: { status: "PENDING", paymentStatus: "PENDING", note: "Pedido creado", createdById: user?.id },
          },
        },
      });

      await reserveStock(
        tx,
        cart.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          label: l.variantName ? `${l.productName} (${l.variantName})` : l.productName,
        })),
        created.id,
      );

      // SKU al momento de la compra.
      const skus = await tx.productVariant.findMany({
        where: { id: { in: cart.lines.map((l) => l.variantId) } },
        select: { id: true, sku: true },
      });
      for (const s of skus) {
        if (s.sku) await tx.orderItem.updateMany({ where: { orderId: created.id, variantId: s.id }, data: { sku: s.sku } });
      }

      for (const l of cart.lines) {
        await tx.product.update({ where: { id: l.productId }, data: { salesCount: { increment: l.quantity } } });
      }

      await tx.cartItem.deleteMany({ where: { cartId } });

      if (user && input.saveAddress) {
        const dup = await tx.address.findFirst({
          where: { userId: user.id, line1: input.line1, city: input.city, fullName: input.fullName },
        });
        if (!dup) {
          const hasAny = await tx.address.count({ where: { userId: user.id } });
          await tx.address.create({
            data: {
              userId: user.id,
              fullName: input.fullName,
              phone: input.phone,
              line1: input.line1,
              line2: input.line2,
              city: input.city,
              state: input.state,
              postalCode: input.postalCode,
              country: input.country,
              notes: input.notes,
              isDefault: hasAny === 0,
            },
          });
        }
      }
      if (user && !user.phone) {
        await tx.user.update({ where: { id: user.id }, data: { phone: input.customerPhone } });
      }
      return created;
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      throw new OrderError(`Lo sentimos, ya no hay stock suficiente de ${err.label}. Actualiza tu carrito.`);
    }
    throw err;
  }

  await notifyOrderPlaced(order.id, accessToken).catch((e) => console.error("[pedido] correo", e));
  return { orderId: order.id, accessToken, provider: order.paymentProvider, totalCents: order.totalCents };
}

/** Crea la sesión de pago en la pasarela y devuelve la URL de redirección. */
export async function startOnlinePayment(orderId: string, accessToken: string): Promise<string> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.accessTokenHash !== hashToken(accessToken)) throw new OrderError("Pedido no encontrado.");
  if (!isOnlineProvider(order.paymentProvider)) throw new OrderError("Este pedido no usa pago en línea.");
  if (order.status !== "PENDING" || order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") {
    throw new OrderError("Este pedido ya no admite pagos.");
  }
  const provider = getOnlineProvider(order.paymentProvider);
  if (!provider.isConfigured()) throw new OrderError("La pasarela de pago no está disponible en este momento.");

  const expiresAt = new Date(order.createdAt.getTime() + pendingOrderTtlMs());
  if (expiresAt.getTime() - Date.now() < 35 * 60_000) {
    throw new OrderError("El tiempo para pagar este pedido está por vencer. Realiza un nuevo pedido.");
  }

  const result = await provider.createCheckout({
    orderId: order.id,
    orderLabel: orderNumber(order.number),
    email: order.email,
    customerName: order.customerName,
    totalCents: order.totalCents,
    currency: order.currency,
    returnUrl: orderUrl(order.id, accessToken),
    expiresAt,
  });

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentReference: result.reference,
      ...(order.paymentStatus === "FAILED" ? { paymentStatus: "PENDING" } : {}),
    },
  });
  return result.redirectUrl;
}

// ─────────────────────────────────── Pagos ───────────────────────────────────

async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return tx.order.findUnique({ where: { id: orderId } });
}

type PaymentEvent = {
  orderId: string;
  provider: PaymentProviderCode;
  externalId: string;
  eventType: string;
  amountCents?: number | null;
  currency?: string | null;
  payload?: Prisma.InputJsonValue;
};

/** Registra el evento; devuelve false si ya se había procesado (idempotencia). */
async function recordTransaction(tx: Tx, ev: PaymentEvent, status: PaymentStatus): Promise<boolean> {
  const inserted = await tx.paymentTransaction.createMany({
    data: [
      {
        orderId: ev.orderId,
        provider: ev.provider,
        externalId: ev.externalId,
        eventType: ev.eventType,
        status,
        amountCents: ev.amountCents ?? null,
        currency: ev.currency ?? null,
        payload: ev.payload,
      },
    ],
    skipDuplicates: true,
  });
  return inserted.count > 0;
}

/**
 * Marca un pedido como pagado. Solo lo invocan los webhooks verificados de la pasarela
 * o un administrador que registra un pago manual. Verifica monto y moneda.
 */
export async function markOrderPaid(ev: PaymentEvent & { byUserId?: string | null; note?: string }) {
  const outcome = await db.$transaction(async (tx) => {
    const order = await lockOrder(tx, ev.orderId);
    if (!order) return "missing" as const;

    const amountOk = ev.amountCents == null || ev.amountCents === order.totalCents;
    const currencyOk = !ev.currency || ev.currency.toUpperCase() === order.currency.toUpperCase();
    if (!amountOk || !currencyOk) {
      await recordTransaction(tx, ev, "FAILED");
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          note: `Pago rechazado por el sistema: el monto o la moneda recibidos (${ev.amountCents} ${ev.currency}) no coinciden con el pedido.`,
        },
      });
      return "mismatch" as const;
    }

    const fresh = await recordTransaction(tx, ev, "PAID");
    if (!fresh || order.paymentStatus === "PAID") return "duplicate" as const;

    const cancelled = order.status === "CANCELLED";
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        ...(order.status === "PENDING" ? { status: "CONFIRMED" } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        paymentStatus: "PAID",
        status: order.status === "PENDING" ? "CONFIRMED" : null,
        createdById: ev.byUserId ?? null,
        note: cancelled
          ? "ATENCIÓN: se recibió el pago de un pedido ya cancelado. Reembolsa el pago o reactiva el pedido manualmente."
          : (ev.note ?? `Pago confirmado por ${ev.provider}`),
      },
    });
    return cancelled ? ("paid_on_cancelled" as const) : ("paid" as const);
  });

  if (outcome === "paid") await notifyOrderPaid(ev.orderId).catch((e) => console.error("[pedido] correo", e));
  return outcome;
}

export async function markPaymentFailed(ev: PaymentEvent & { note?: string }) {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, ev.orderId);
    if (!order) return "missing" as const;
    const fresh = await recordTransaction(tx, ev, "FAILED");
    if (!fresh) return "duplicate" as const;
    if (order.paymentStatus !== "PENDING") return "ignored" as const;
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, paymentStatus: "FAILED", note: ev.note ?? `Pago no aprobado (${ev.provider})` },
    });
    return "failed" as const;
  });
}

/** Evento informativo (pendiente, en proceso): solo queda en el registro de transacciones. */
export async function recordPaymentEvent(ev: PaymentEvent, status: PaymentStatus = "PENDING") {
  return db.$transaction((tx) => recordTransaction(tx, ev, status));
}

// ─────────────────────────────── Estados del pedido ───────────────────────────────

/** Cancela, devuelve stock, revierte ventas y el uso del cupón. */
export async function cancelOrder(orderId: string, opts: { userId: string | null; note: string }) {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) throw new OrderError("Pedido no encontrado.");
    if (order.status === "CANCELLED") return false;
    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
      throw new OrderError("No se puede cancelar un pedido enviado o entregado.");
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await releaseOrderStock(tx, orderId, opts.userId);

    const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
    for (const it of items) {
      await tx.$executeRaw`UPDATE "Product" SET "salesCount" = GREATEST("salesCount" - ${it.quantity}, 0) WHERE "id" = ${it.productId!}`;
    }
    if (order.couponId) {
      await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${order.couponId}`;
    }
    const paidNote = order.paymentStatus === "PAID" ? " El pedido estaba pagado: gestiona el reembolso en la pasarela." : "";
    await tx.orderStatusHistory.create({
      data: { orderId, status: "CANCELLED", note: opts.note + paidNote, createdById: opts.userId },
    });
    return true;
  });
}

export async function changeOrderStatus(
  orderId: string,
  to: OrderStatus,
  opts: { userId: string; note?: string | null },
) {
  if (to === "CANCELLED") return cancelOrder(orderId, { userId: opts.userId, note: opts.note || "Cancelado por la tienda" });

  const changed = await db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) throw new OrderError("Pedido no encontrado.");
    if (!ORDER_TRANSITIONS[order.status].includes(to)) {
      throw new OrderError("Ese cambio de estado no está permitido.");
    }
    const now = new Date();
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(to === "SHIPPED" ? { shippedAt: now } : {}),
        ...(to === "DELIVERED" ? { deliveredAt: now } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, status: to, note: opts.note || null, createdById: opts.userId },
    });
    return true;
  });
  if (changed && to === "SHIPPED") await notifyOrderShipped(orderId).catch((e) => console.error("[pedido] correo", e));
  return changed;
}

/** Cancela pedidos con pago en línea que no se completaron a tiempo y libera su stock. */
export async function expireStalePendingOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - pendingOrderTtlMs());
  const stale = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      paymentProvider: { in: ["STRIPE", "MERCADOPAGO"] },
      createdAt: { lt: cutoff },
    },
    select: { id: true },
    take: 200,
  });
  let count = 0;
  for (const o of stale) {
    try {
      if (await cancelOrder(o.id, { userId: null, note: "Cancelado automáticamente: el pago en línea no se completó a tiempo." })) count++;
    } catch (e) {
      console.error("[pedidos] no se pudo expirar", o.id, e);
    }
  }
  return count;
}

// ─────────────────────────────────── Consulta ───────────────────────────────────

export const orderDetailInclude = {
  items: true,
  history: { orderBy: { createdAt: "asc" }, include: { createdBy: { select: { name: true } } } },
} satisfies Prisma.OrderInclude;

/** Pedido visible para quien tenga el token, sea el dueño o personal de la tienda. */
export async function getOrderForViewer(orderId: string, accessToken: string | null, viewer: SessionUser | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
  if (!order) return null;
  const tokenOk = accessToken != null && hashToken(accessToken) === order.accessTokenHash;
  const ownerOk = viewer != null && order.userId === viewer.id;
  const staffOk = viewer != null && (viewer.role === "ADMIN" || viewer.role === "STAFF");
  return tokenOk || ownerOk || staffOk ? order : null;
}
