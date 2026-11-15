import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Landmark, XCircle } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { OrderItemsTable, OrderStatusBadge, OrderTimeline, ShippingInfo } from "@/components/store/order-parts";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getOrderForViewer } from "@/lib/orders";
import { isOnlineProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";
import { PurchaseTracker, RetryPaymentButton } from "./order-client";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; pago?: string; nuevo?: string }> };

export default async function PedidoPage({ params, searchParams }: Props) {
  const [{ id }, sp, viewer, settings] = await Promise.all([params, searchParams, getCurrentUser(), getSettings()]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const order = await getOrderForViewer(id, token, viewer);
  if (!order) notFound();

  const money = { currency: order.currency, locale: settings.locale };
  const label = orderNumber(order.number);
  const online = isOnlineProvider(order.paymentProvider);
  const canPay = online && token && order.status === "PENDING" && (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED");
  const paymentConfig =
    order.paymentProvider === "BANK_TRANSFER" ? await db.paymentMethodConfig.findUnique({ where: { provider: "BANK_TRANSFER" } }) : null;

  const confirmedForTracking = order.status !== "CANCELLED" && (order.paymentStatus === "PAID" || !online);
  const adsSendTo = settings.googleAdsId && settings.googleAdsPurchaseLabel ? `${settings.googleAdsId}/${settings.googleAdsPurchaseLabel}` : null;

  let banner: { icon: typeof CheckCircle2; title: string; text: string; tone: "ok" | "wait" | "bad" };
  if (order.status === "CANCELLED") {
    banner = { icon: XCircle, title: "Pedido cancelado", text: "Este pedido fue cancelado. Si tienes dudas, contáctanos.", tone: "bad" };
  } else if (order.paymentStatus === "PAID") {
    banner = { icon: CheckCircle2, title: "¡Gracias por tu compra!", text: "Tu pago fue confirmado. Te avisaremos por correo cuando tu pedido sea enviado.", tone: "ok" };
  } else if (online && order.paymentStatus === "FAILED") {
    banner = { icon: AlertTriangle, title: "El pago no fue aprobado", text: "Puedes intentarlo de nuevo con otro medio de pago. Tus productos siguen reservados por tiempo limitado.", tone: "bad" };
  } else if (online && sp.pago === "error") {
    banner = { icon: AlertTriangle, title: "No pudimos conectar con la pasarela de pago", text: "Tu pedido quedó registrado y tus productos reservados por tiempo limitado. Intenta pagar de nuevo.", tone: "bad" };
  } else if (online && sp.pago === "retorno") {
    banner = { icon: Clock, title: "Estamos confirmando tu pago", text: "La pasarela nos notificará el resultado en breve. Actualiza esta página en unos momentos.", tone: "wait" };
  } else if (online) {
    banner = { icon: Clock, title: "Pago pendiente", text: "Completa el pago para confirmar tu pedido. Tus productos están reservados por tiempo limitado.", tone: "wait" };
  } else if (order.paymentProvider === "BANK_TRANSFER") {
    banner = { icon: Landmark, title: "¡Pedido recibido!", text: "Realiza la transferencia con los datos indicados abajo. Confirmaremos tu pedido al verificar el pago.", tone: "wait" };
  } else {
    banner = { icon: CheckCircle2, title: "¡Pedido recibido!", text: "Pagarás al recibir tu pedido. Te avisaremos cuando sea enviado.", tone: "ok" };
  }
  const Icon = banner.icon;

  return (
    <Container className="max-w-5xl py-10">
      {confirmedForTracking && (
        <PurchaseTracker
          transactionId={label}
          value={order.totalCents / 100}
          currency={order.currency}
          shipping={order.shippingCents / 100}
          coupon={order.couponCode}
          adsSendTo={adsSendTo}
          items={order.items.map((i) => ({ item_id: i.productId ?? i.id, item_name: i.productName, item_variant: i.variantName ?? undefined, price: i.unitPriceCents / 100, quantity: i.quantity }))}
        />
      )}

      <div
        className={`mb-8 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center ${
          banner.tone === "bad" ? "border-acma/50 bg-acma/10" : banner.tone === "ok" ? "border-line-strong bg-carbon" : "border-line bg-carbon"
        }`}
      >
        <Icon className={`size-12 shrink-0 ${banner.tone === "ok" ? "text-white" : "text-acma"}`} />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold uppercase">{banner.title}</h1>
          <p className="mt-1 text-silver">{banner.text}</p>
        </div>
        {canPay && <RetryPaymentButton orderId={order.id} token={token!} label={order.paymentStatus === "FAILED" ? "Reintentar pago" : "Pagar ahora"} />}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-silver">
        <p>
          Pedido <span className="font-bold text-white">{label}</span>
        </p>
        <p>{formatDate(order.createdAt, settings.locale, true)}</p>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mb-8 rounded-xl border border-line bg-carbon p-5 sm:p-6">
        <OrderTimeline status={order.status} />
      </div>

      {paymentConfig?.instructions && order.paymentStatus !== "PAID" && order.status !== "CANCELLED" && (
        <section className="mb-8 rounded-xl border border-acma/40 bg-carbon p-5 sm:p-6">
          <h2 className="mb-3 font-display text-xl font-bold uppercase">Datos para la transferencia</h2>
          <RichText content={paymentConfig.instructions} />
          <p className="mt-3 text-sm text-silver">
            Indica el número de pedido <strong className="text-white">{label}</strong> en la referencia de tu transferencia.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <OrderItemsTable order={order} items={order.items} money={money} />
        <ShippingInfo order={order} />
      </div>

      <p className="mt-8 text-sm text-silver">
        Guarda este enlace para consultar tu pedido. También enviamos los detalles a <strong className="text-white">{order.email}</strong>.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/tienda" variant="secondary">
          Seguir comprando
        </ButtonLink>
        {viewer && order.userId === viewer.id && (
          <ButtonLink href="/cuenta/pedidos" variant="ghost">
            Ver mis pedidos
          </ButtonLink>
        )}
      </div>
    </Container>
  );
}
