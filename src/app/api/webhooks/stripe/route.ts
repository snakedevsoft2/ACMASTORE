import type Stripe from "stripe";
import { cancelOrder, markOrderPaid, markPaymentFailed, recordPaymentEvent } from "@/lib/orders";
import { fromStripeAmount, getStripe } from "@/lib/payments/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Webhook de Stripe. Configurar en el panel de Stripe apuntando a /api/webhooks/stripe con los eventos:
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Stripe no configurado", { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Falta firma", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new Response("Firma inválida", { status: 400 });
  }

  if (!event.type.startsWith("checkout.session.")) return Response.json({ received: true, ignored: event.type });

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return Response.json({ received: true, ignored: "sin pedido" });

  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, paymentReference: true } });
  if (!order) return Response.json({ received: true, ignored: "pedido no encontrado" });

  const currency = (session.currency ?? "").toUpperCase();
  const base = {
    orderId,
    provider: "STRIPE" as const,
    externalId: event.id,
    eventType: event.type,
    amountCents: session.amount_total != null ? fromStripeAmount(session.amount_total, currency) : null,
    currency,
    payload: { sessionId: session.id, paymentStatus: session.payment_status, paymentIntent: String(session.payment_intent ?? "") },
  };

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (session.payment_status === "paid") await markOrderPaid(base);
        else await recordPaymentEvent(base, "PENDING"); // Pago asíncrono en proceso.
        break;
      case "checkout.session.async_payment_failed":
        await markPaymentFailed({ ...base, note: "Stripe: el pago asíncrono falló." });
        break;
      case "checkout.session.expired":
        await recordPaymentEvent(base, "FAILED");
        // Solo se cancela si esta sesión es la vigente del pedido (pudo haber un reintento posterior).
        if (order.paymentReference === session.id) {
          const fresh = await db.order.findUnique({ where: { id: orderId }, select: { status: true, paymentStatus: true } });
          if (fresh?.status === "PENDING" && fresh.paymentStatus !== "PAID") {
            await cancelOrder(orderId, { userId: null, note: "Cancelado automáticamente: la sesión de pago de Stripe expiró." });
          }
        }
        break;
    }
  } catch (err) {
    console.error("[stripe] error procesando evento", event.id, err);
    // 500 hace que Stripe reintente el evento.
    return new Response("Error interno", { status: 500 });
  }
  return Response.json({ received: true });
}
