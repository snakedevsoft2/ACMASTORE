import { db } from "@/lib/db";
import { markOrderPaid, markPaymentFailed, recordPaymentEvent } from "@/lib/orders";
import { getMercadoPagoPayment, verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";

export const runtime = "nodejs";

/**
 * Notificaciones de Mercado Pago (tópico "payment").
 * Seguridad: si MERCADOPAGO_WEBHOOK_SECRET está definido se valida la firma x-signature.
 * Además, el estado del pago SIEMPRE se consulta directamente a la API de Mercado Pago
 * con nuestro token: el contenido de la notificación nunca se toma como verdad.
 */
export async function POST(req: Request) {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return new Response("Mercado Pago no configurado", { status: 503 });

  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; action?: string; data?: { id?: string | number } };
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(url.searchParams.get("data.id") ?? body.data?.id ?? url.searchParams.get("id") ?? "");

  if (type !== "payment" || !dataId) return Response.json({ received: true, ignored: type ?? "sin tipo" });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifyMercadoPagoSignature({
      signatureHeader: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!valid) return new Response("Firma inválida", { status: 401 });
  }

  let payment;
  try {
    payment = await getMercadoPagoPayment(dataId);
  } catch (err) {
    console.error("[mercadopago] no se pudo consultar el pago", dataId, err);
    return new Response("Error consultando el pago", { status: 502 });
  }

  const orderId = payment.external_reference;
  if (!orderId) return Response.json({ received: true, ignored: "sin referencia" });
  const exists = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!exists) return Response.json({ received: true, ignored: "pedido no encontrado" });

  const base = {
    orderId,
    provider: "MERCADOPAGO" as const,
    // El mismo pago cambia de estado: se registra un evento por estado.
    externalId: String(payment.id),
    eventType: `payment.${payment.status}`,
    amountCents: Math.round(payment.transaction_amount * 100),
    currency: payment.currency_id,
    payload: { status: payment.status, statusDetail: payment.status_detail ?? null },
  };

  try {
    switch (payment.status) {
      case "approved":
        await markOrderPaid(base);
        break;
      case "rejected":
      case "cancelled":
        await markPaymentFailed({ ...base, note: `Mercado Pago: pago ${payment.status} (${payment.status_detail ?? "sin detalle"}).` });
        break;
      case "refunded":
      case "charged_back":
        if (await recordPaymentEvent(base, "REFUNDED")) {
          await db.order.updateMany({ where: { id: orderId, paymentStatus: "PAID" }, data: { paymentStatus: "REFUNDED" } });
          await db.orderStatusHistory.create({
            data: {
              orderId,
              paymentStatus: "REFUNDED",
              note: `Mercado Pago informa ${payment.status === "refunded" ? "reembolso" : "contracargo"} del pago ${payment.id}. Revisa el pedido.`,
            },
          });
        }
        break;
      default:
        await recordPaymentEvent(base, "PENDING");
    }
  } catch (err) {
    console.error("[mercadopago] error procesando pago", payment.id, err);
    return new Response("Error interno", { status: 500 });
  }
  return Response.json({ received: true });
}
