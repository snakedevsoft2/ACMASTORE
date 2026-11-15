"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getCart, removeItem, setItemQuantity } from "@/lib/cart";
import { findCoupon } from "@/lib/coupons";
import { OrderError, placeOrder, startOnlinePayment } from "@/lib/orders";
import { isOnlineProvider } from "@/lib/payments";
import { PaymentProviderError } from "@/lib/payments/types";
import { checkoutSchema, invalid, type ActionState } from "@/lib/validation";

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export type CouponPreview =
  | { ok: true; code: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number | null; description: string | null }
  | { ok: false; error: string };

/** Valida un cupón contra el carrito actual (el subtotal lo calcula el servidor). */
export async function previewCouponAction(code: string): Promise<CouponPreview> {
  const rl = rateLimit(`coupon:${await clientKey()}`, 20, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  const clean = String(code ?? "").trim();
  if (!clean) return { ok: false, error: "Ingresa un código." };
  const cart = await getCart();
  const res = await findCoupon(clean, cart.subtotalCents);
  if (!res.coupon) return { ok: false, error: res.error };
  const c = res.coupon;
  return { ok: true, code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, description: c.description };
}

/** Corrige el carrito: quita productos no disponibles y ajusta cantidades al stock. */
export async function fixCartAction() {
  const cart = await getCart();
  for (const line of cart.lines) {
    if (!line.issue) continue;
    if (line.stock <= 0 || line.issue.includes("disponible")) await removeItem(line.itemId);
    else await setItemQuantity(line.itemId, line.stock);
  }
  revalidatePath("/", "layout");
}

export async function placeOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const rl = rateLimit(`order:${await clientKey()}`, 10, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo." };

  const parsed = checkoutSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);

  const expected = Number(fd.get("expectedTotalCents"));
  const user = await getCurrentUser();

  let result;
  try {
    result = await placeOrder(parsed.data, user, Number.isFinite(expected) ? expected : null);
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, error: err.message };
    console.error("[checkout] error al crear pedido", err);
    return { ok: false, error: "No pudimos registrar tu pedido. Intenta de nuevo en unos minutos." };
  }

  revalidatePath("/", "layout");
  const orderPath = `/pedido/${result.orderId}?t=${encodeURIComponent(result.accessToken)}`;

  if (isOnlineProvider(result.provider)) {
    let paymentUrl: string | null = null;
    try {
      paymentUrl = await startOnlinePayment(result.orderId, result.accessToken);
    } catch (err) {
      // El pedido existe y conserva su stock; el cliente puede reintentar el pago desde su pedido.
      console.error("[checkout] no se pudo iniciar el pago", err instanceof PaymentProviderError ? err.message : err);
    }
    redirect(paymentUrl ?? `${orderPath}&pago=error`);
  }
  redirect(`${orderPath}&nuevo=1`);
}

/** Reintenta el pago en línea de un pedido pendiente (requiere el token del pedido). */
export async function retryPaymentAction(orderId: string, accessToken: string): Promise<{ error: string }> {
  const rl = rateLimit(`retry:${await clientKey()}`, 10, 10 * 60_000);
  if (!rl.ok) return { error: "Demasiados intentos. Espera unos minutos." };
  let url: string;
  try {
    url = await startOnlinePayment(String(orderId), String(accessToken));
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message };
    console.error("[pago] reintento fallido", err);
    return { error: "La pasarela de pago no respondió. Intenta de nuevo en unos minutos." };
  }
  redirect(url);
}
