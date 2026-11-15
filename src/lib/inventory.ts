import "server-only";
import type { InventoryReason, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;

export class OutOfStockError extends Error {
  constructor(public readonly variantId: string, public readonly label: string) {
    super(`Sin stock suficiente: ${label}`);
  }
}

/**
 * Descuenta stock de forma atómica: la condición `stock >= qty` y la resta ocurren en
 * la misma sentencia, así dos compras simultáneas no pueden vender la misma unidad.
 */
export async function reserveStock(
  tx: Tx,
  lines: Array<{ variantId: string; quantity: number; label: string }>,
  orderId: string,
) {
  for (const line of lines) {
    // Las variantes "sin control de inventario" solo se verifican activas: no descuentan unidades.
    const rows = await tx.$queryRaw<Array<{ stock: number; trackStock: boolean }>>`
      UPDATE "ProductVariant"
         SET "stock" = CASE WHEN "trackStock" THEN "stock" - ${line.quantity} ELSE "stock" END, "updatedAt" = NOW()
       WHERE "id" = ${line.variantId} AND "isActive" = true
         AND (NOT "trackStock" OR "stock" >= ${line.quantity})
   RETURNING "stock", "trackStock"`;
    if (rows.length === 0) throw new OutOfStockError(line.variantId, line.label);
    if (!rows[0].trackStock) continue;
    await tx.inventoryMovement.create({
      data: {
        variantId: line.variantId,
        delta: -line.quantity,
        stockAfter: rows[0].stock,
        reason: "ORDER",
        orderId,
      },
    });
  }
}

/** Devuelve al inventario las unidades de un pedido cancelado. */
export async function releaseOrderStock(tx: Tx, orderId: string, userId: string | null) {
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } } });
  for (const item of items) {
    const rows = await tx.$queryRaw<Array<{ stock: number }>>`
      UPDATE "ProductVariant" SET "stock" = "stock" + ${item.quantity}, "updatedAt" = NOW()
       WHERE "id" = ${item.variantId!} AND "trackStock" = true RETURNING "stock"`;
    // Variante eliminada o sin control de inventario: no hay stock que devolver.
    if (rows.length === 0) continue;
    await tx.inventoryMovement.create({
      data: {
        variantId: item.variantId!,
        delta: item.quantity,
        stockAfter: rows[0].stock,
        reason: "ORDER_CANCELLED",
        orderId,
        userId,
      },
    });
  }
}

/** Ajuste manual desde el admin: fija el stock a un valor y registra la diferencia. */
export async function setStock(opts: {
  variantId: string;
  newStock: number;
  userId: string;
  reason?: Extract<InventoryReason, "ADJUSTMENT" | "RESTOCK" | "INITIAL">;
  note?: string | null;
}) {
  const newStock = Math.max(0, Math.floor(opts.newStock));
  return db.$transaction(async (tx) => {
    const current = await tx.$queryRaw<Array<{ stock: number }>>`
      SELECT "stock" FROM "ProductVariant" WHERE "id" = ${opts.variantId} FOR UPDATE`;
    if (current.length === 0) throw new Error("Variante no encontrada");
    const delta = newStock - current[0].stock;
    if (delta === 0) return current[0].stock;
    await tx.productVariant.update({ where: { id: opts.variantId }, data: { stock: newStock } });
    await tx.inventoryMovement.create({
      data: {
        variantId: opts.variantId,
        delta,
        stockAfter: newStock,
        reason: opts.reason ?? (delta > 0 ? "RESTOCK" : "ADJUSTMENT"),
        userId: opts.userId,
        note: opts.note ?? null,
      },
    });
    return newStock;
  });
}
