import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { effectivePrice } from "@/lib/pricing";

export const CART_COOKIE = "acma_cart";
export const MAX_QTY_PER_LINE = 99;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              priceCents: true,
              compareAtCents: true,
              images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
              _count: { select: { options: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  compareAtCents: number | null;
  quantity: number;
  stock: number;
  /** Máximo que se puede pedir en esta línea (stock, o 99 sin control de inventario). */
  maxQty: number;
  lineTotalCents: number;
  /** Motivo por el que la línea no se puede comprar tal cual. */
  issue: string | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  hasIssues: boolean;
};

const EMPTY: CartView = { id: null, lines: [], count: 0, subtotalCents: 0, hasIssues: false };

function toView(cart: CartRow | null): CartView {
  if (!cart) return EMPTY;
  const lines: CartLine[] = cart.items.map((it) => {
    const v = it.variant;
    const p = v.product;
    const price = effectivePrice(p, v);
    let issue: string | null = null;
    if (p.status !== "ACTIVE" || !v.isActive) issue = "Este producto ya no está disponible.";
    else if (v.trackStock && v.stock <= 0) issue = "Agotado.";
    else if (v.trackStock && it.quantity > v.stock) issue = v.stock === 1 ? "Solo queda 1 unidad." : `Solo quedan ${v.stock} unidades.`;
    return {
      itemId: it.id,
      variantId: v.id,
      productId: p.id,
      productSlug: p.slug,
      productName: p.name,
      variantName: p._count.options > 0 ? v.name : null,
      imageUrl: p.images[0]?.url ?? null,
      unitPriceCents: price.priceCents,
      compareAtCents: price.compareAtCents,
      quantity: it.quantity,
      stock: v.stock,
      maxQty: v.trackStock ? Math.min(Math.max(v.stock, 0), MAX_QTY_PER_LINE) : MAX_QTY_PER_LINE,
      lineTotalCents: price.priceCents * it.quantity,
      issue,
    };
  });
  return {
    id: cart.id,
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotalCents: lines.filter((l) => !l.issue).reduce((s, l) => s + l.lineTotalCents, 0),
    hasIssues: lines.some((l) => l.issue),
  };
}

async function loadCart(): Promise<CartRow | null> {
  const user = await getCurrentUser();
  if (user) return db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { tokenHash: hashToken(token) }, include: cartInclude });
}

/** Carrito de la petición actual con precios y stock vigentes. */
export const getCart = cache(async (): Promise<CartView> => toView(await loadCart()));

/** Solo en Server Actions (puede escribir la cookie). */
export async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    return cart.id;
  }
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (token) {
    const cart = await db.cart.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true } });
    if (cart) return cart.id;
  }
  const fresh = generateToken();
  const cart = await db.cart.create({ data: { tokenHash: hashToken(fresh) } });
  store.set(CART_COOKIE, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return cart.id;
}

export class CartError extends Error {}

/** Agrega unidades validando producto activo y stock. Devuelve la cantidad final de la línea. */
export async function addItem(variantId: string, quantity: number): Promise<number> {
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty < 1) throw new CartError("Cantidad no válida.");

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, trackStock: true, isActive: true, product: { select: { status: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
    throw new CartError("Este producto no está disponible.");
  }
  if (variant.trackStock && variant.stock <= 0) throw new CartError("Producto agotado.");

  const cartId = await getOrCreateCartId();
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const limit = variant.trackStock ? Math.min(variant.stock, MAX_QTY_PER_LINE) : MAX_QTY_PER_LINE;
  const target = Math.min((existing?.quantity ?? 0) + qty, limit);
  if (existing && existing.quantity >= limit) {
    throw new CartError(`Ya tienes en el carrito todas las unidades disponibles (${limit}).`);
  }

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    update: { quantity: target },
    create: { cartId, variantId, quantity: target },
  });
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  return target;
}

async function ownedItem(itemId: string) {
  const cart = await loadCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!item) throw new CartError("El producto ya no está en tu carrito.");
  return item;
}

export async function setItemQuantity(itemId: string, quantity: number) {
  const item = await ownedItem(itemId);
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty < 0) throw new CartError("Cantidad no válida.");
  if (qty === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const limit = item.variant.trackStock ? Math.max(1, Math.min(item.variant.stock, MAX_QTY_PER_LINE)) : MAX_QTY_PER_LINE;
  await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(qty, limit) } });
}

export async function removeItem(itemId: string) {
  const item = await ownedItem(itemId);
  await db.cartItem.delete({ where: { id: item.id } });
}

/** Al iniciar sesión, mueve el carrito de invitado al carrito del usuario. */
export async function mergeGuestCart(userId: string) {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { items: { include: { variant: { select: { stock: true, trackStock: true } } } } },
  });
  store.delete(CART_COOKIE);
  if (!guest) return;

  if (guest.items.length > 0) {
    const userCart = await db.cart.upsert({ where: { userId }, update: {}, create: { userId }, include: { items: true } });
    for (const gi of guest.items) {
      const current = userCart.items.find((i) => i.variantId === gi.variantId)?.quantity ?? 0;
      const cap = gi.variant.trackStock ? Math.max(gi.variant.stock, 1) : MAX_QTY_PER_LINE;
      const qty = Math.min(current + gi.quantity, cap, MAX_QTY_PER_LINE);
      await db.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: gi.variantId } },
        update: { quantity: qty },
        create: { cartId: userCart.id, variantId: gi.variantId, quantity: qty },
      });
    }
  }
  await db.cart.delete({ where: { id: guest.id } });
}
