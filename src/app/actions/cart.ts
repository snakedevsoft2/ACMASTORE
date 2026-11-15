"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addItem, CartError, removeItem, setItemQuantity } from "@/lib/cart";

export type CartActionResult = { ok: boolean; error?: string; quantity?: number };

function fail(err: unknown): CartActionResult {
  if (err instanceof CartError) return { ok: false, error: err.message };
  console.error("[carrito]", err);
  return { ok: false, error: "No pudimos actualizar el carrito. Intenta de nuevo." };
}

export async function addToCartAction(variantId: string, quantity: number): Promise<CartActionResult> {
  try {
    const q = await addItem(String(variantId), Number(quantity));
    revalidatePath("/", "layout");
    return { ok: true, quantity: q };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<CartActionResult> {
  try {
    await setItemQuantity(String(itemId), Number(quantity));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeCartItemAction(itemId: string): Promise<CartActionResult> {
  try {
    await removeItem(String(itemId));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** "Comprar ahora": agrega la unidad y lleva directo al checkout. */
export async function buyNowAction(variantId: string, quantity: number): Promise<CartActionResult> {
  try {
    await addItem(String(variantId), Number(quantity));
  } catch (err) {
    // Si ya estaba en el carrito con el máximo disponible, igual se continúa al checkout.
    if (!(err instanceof CartError && err.message.startsWith("Ya tienes"))) return fail(err);
  }
  revalidatePath("/", "layout");
  redirect("/checkout");
}
