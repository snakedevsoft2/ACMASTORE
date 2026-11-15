import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderItemsTable, OrderStatusBadge, OrderTimeline, ShippingInfo } from "@/components/store/order-parts";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle del pedido", robots: { index: false } };

export default async function PedidoDetallePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const user = await requireUser(`/cuenta/pedidos/${numero}`);
  const n = Number.parseInt(numero, 10);
  if (!Number.isFinite(n)) notFound();

  const [order, settings] = await Promise.all([
    db.order.findFirst({
      where: { number: n, userId: user.id },
      include: { items: true, history: { orderBy: { createdAt: "asc" } } },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/cuenta/pedidos" className="text-sm text-silver hover:text-white">
          ← Mis pedidos
        </Link>
        <h2 className="font-display text-2xl font-bold uppercase">{orderNumber(order.number)}</h2>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-silver">{formatDate(order.createdAt, settings.locale, true)}</span>
      </div>
      <div className="rounded-xl border border-line bg-carbon p-5">
        <OrderTimeline status={order.status} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <OrderItemsTable order={order} items={order.items} money={{ currency: order.currency, locale: settings.locale }} />
        <ShippingInfo order={order} />
      </div>
      <section className="rounded-xl border border-line bg-carbon p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-acma">Historial</h3>
        <ol className="space-y-2 text-sm">
          {order.history
            .filter((h) => h.status || h.paymentStatus)
            .map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3">
                <span className="text-silver-dim">{formatDate(h.createdAt, settings.locale, true)}</span>
                <span>
                  {h.status ? ORDER_STATUS_LABELS[h.status] : ""}
                  {h.status && h.paymentStatus ? " · " : ""}
                  {h.paymentStatus ? PAYMENT_STATUS_LABELS[h.paymentStatus] : ""}
                </span>
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}
