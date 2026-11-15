"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { assertPermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { changeOrderStatus, expireStalePendingOrders, markOrderPaid, OrderError } from "@/lib/orders";
import { ORDER_TRANSITIONS } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";

function refresh(orderId: string) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}

export async function changeStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("orders:manage");
  const orderId = String(fd.get("orderId") ?? "");
  const to = String(fd.get("status") ?? "") as OrderStatus;
  const note = String(fd.get("note") ?? "").trim().slice(0, 500) || null;
  if (!(to in ORDER_TRANSITIONS)) return { error: "Estado no válido." };
  try {
    await changeOrderStatus(orderId, to, { userId: user.id, note });
  } catch (err) {
    return { error: err instanceof OrderError ? err.message : "No se pudo cambiar el estado." };
  }
  refresh(orderId);
  return { ok: true, message: "Estado actualizado." };
}

const shippingSchema = z.object({
  carrier: z.string().trim().max(80).optional().default(""),
  trackingNumber: z.string().trim().max(80).optional().default(""),
  trackingUrl: z.union([z.literal(""), z.string().trim().url("URL no válida").max(500).refine((u) => /^https?:\/\//i.test(u), "Debe empezar por http(s)://")]).default(""),
});

export async function saveShippingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("orders:manage");
  const orderId = String(fd.get("orderId") ?? "");
  const parsed = shippingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Pedido no encontrado." };

  await db.order.update({
    where: { id: orderId },
    data: {
      carrier: parsed.data.carrier || null,
      trackingNumber: parsed.data.trackingNumber || null,
      trackingUrl: parsed.data.trackingUrl || null,
    },
  });
  await db.orderStatusHistory.create({
    data: {
      orderId,
      createdById: user.id,
      note: `Datos de envío: ${parsed.data.carrier || "sin transportadora"} · guía ${parsed.data.trackingNumber || "—"}`,
    },
  });

  if (fd.get("markShipped") === "on" && ORDER_TRANSITIONS[order.status].includes("SHIPPED")) {
    try {
      await changeOrderStatus(orderId, "SHIPPED", { userId: user.id, note: "Pedido despachado" });
    } catch (err) {
      return { error: err instanceof OrderError ? err.message : "Se guardó el envío, pero no se pudo marcar como enviado." };
    }
  }
  refresh(orderId);
  return { ok: true, message: "Información de envío guardada." };
}

export async function registerPaymentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("orders:manage");
  const orderId = String(fd.get("orderId") ?? "");
  const reference = String(fd.get("reference") ?? "").trim().slice(0, 120);
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Pedido no encontrado." };
  if (order.paymentStatus === "PAID") return { error: "El pedido ya figura como pagado." };
  if (order.status === "CANCELLED") return { error: "El pedido está cancelado." };
  if (!reference) return { error: "Indica la referencia o comprobante del pago (ej. número de transferencia)." };

  const result = await markOrderPaid({
    orderId,
    provider: order.paymentProvider,
    externalId: `manual-${Date.now()}`,
    eventType: "manual.registered",
    amountCents: order.totalCents,
    currency: order.currency,
    payload: { reference, registeredBy: user.email },
    byUserId: user.id,
    note: `Pago registrado manualmente por ${user.name}. Referencia: ${reference}`,
  });
  refresh(orderId);
  return result === "paid" ? { ok: true, message: "Pago registrado." } : { error: "No se pudo registrar el pago." };
}

export async function markRefundedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("orders:manage");
  const orderId = String(fd.get("orderId") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  const res = await db.order.updateMany({ where: { id: orderId, paymentStatus: "PAID" }, data: { paymentStatus: "REFUNDED" } });
  if (res.count === 0) return { error: "Solo se puede registrar el reembolso de un pedido pagado." };
  await db.orderStatusHistory.create({
    data: { orderId, paymentStatus: "REFUNDED", createdById: user.id, note: `Reembolso registrado. ${note}`.trim() },
  });
  refresh(orderId);
  return { ok: true, message: "Reembolso registrado." };
}

export async function saveAdminNoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("orders:manage");
  const orderId = String(fd.get("orderId") ?? "");
  await db.order.update({ where: { id: orderId }, data: { adminNote: String(fd.get("adminNote") ?? "").slice(0, 5000) || null } });
  refresh(orderId);
  return { ok: true, message: "Nota guardada." };
}

export async function expireOrdersNowAction(): Promise<ActionState> {
  await assertPermission("orders:manage");
  const n = await expireStalePendingOrders();
  revalidatePath("/admin/pedidos");
  return { ok: true, message: n === 0 ? "No había pedidos vencidos." : `Se cancelaron ${n} pedidos vencidos y se liberó su stock.` };
}
