"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/session";
import { setStock } from "@/lib/inventory";
import type { ActionState } from "@/lib/validation";

export async function adjustStockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("products:manage");
  const variantId = String(fd.get("variantId") ?? "");
  const raw = String(fd.get("stock") ?? "").trim();
  const stock = Number(raw);
  if (!raw || !Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return { error: "Ingresa un número entero ≥ 0." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 200) || null;
  try {
    await setStock({ variantId, newStock: stock, userId: user.id, note });
  } catch {
    return { error: "No se pudo actualizar." };
  }
  revalidatePath("/admin/inventario");
  revalidatePath("/", "layout");
  return { ok: true, message: "Actualizado" };
}
