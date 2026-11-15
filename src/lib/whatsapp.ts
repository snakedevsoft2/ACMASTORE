/** Enlaces de WhatsApp (wa.me) con mensajes prellenados. Seguro para cliente y servidor. */

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export type WhatsAppIntent = "comprar" | "separar" | "asesoria" | "consultar";

/** Mensaje para separar o consultar un producto concreto. */
export function productMessage(opts: {
  intent: WhatsAppIntent;
  name: string;
  variant?: string | null;
  price?: string | null;
  quantity?: number;
  url?: string | null;
}): string {
  const item = `${opts.name}${opts.variant ? ` (${opts.variant})` : ""}`;
  const qty = opts.quantity && opts.quantity > 1 ? `${opts.quantity} unidades de ` : "";
  const head =
    opts.intent === "separar" || opts.intent === "comprar"
      ? `Hola ACMA STORE 👋 Quiero ${opts.intent} ${qty}${item}${opts.price ? ` – ${opts.price}` : ""}.`
      : opts.intent === "consultar"
        ? `Hola ACMA STORE 👋 ¿Me confirman disponibilidad de ${item}?`
        : `Hola ACMA STORE 👋 Quiero asesoría sobre ${item}.`;
  return opts.url ? `${head}\n${opts.url}` : head;
}

/** Mensaje con el contenido completo del carrito. */
export function cartMessage(lines: Array<{ name: string; variant?: string | null; quantity: number; total: string }>, subtotal: string): string {
  const items = lines.map((l) => `• ${l.quantity} x ${l.name}${l.variant ? ` (${l.variant})` : ""} – ${l.total}`).join("\n");
  return `Hola ACMA STORE 👋 Quiero hacer este pedido:\n${items}\nSubtotal: ${subtotal}`;
}

export const GENERAL_MESSAGE = "Hola ACMA STORE 👋 Quiero asesoría para mi compra.";
