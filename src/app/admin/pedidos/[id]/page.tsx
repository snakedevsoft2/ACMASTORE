import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, User } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/ui";
import { OrderItemsTable, OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-parts";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, PAYMENT_STATUS_LABELS, PROVIDER_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { isOnlineProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";
import { AdminNoteForm, RefundForm, RegisterPaymentForm, ShippingForm, StatusForm } from "../order-forms";

export const metadata = { title: "Detalle del pedido" };

export default async function PedidoAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("orders:manage");
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: true,
        history: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        transactions: { orderBy: { createdAt: "desc" } },
        user: { select: { id: true, name: true, _count: { select: { orders: true } } } },
      },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const money = { currency: order.currency, locale: settings.locale };
  const allowed = ORDER_TRANSITIONS[order.status];
  const online = isOnlineProvider(order.paymentProvider);

  return (
    <>
      <PageHeader
        title={orderNumber(order.number)}
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(order.createdAt, settings.locale, true)} · <OrderStatusBadge status={order.status} /> <PaymentStatusBadge status={order.paymentStatus} />
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Productos">
            <OrderItemsTable order={order} items={order.items} money={money} />
            {order.items.some((i) => i.sku) && (
              <p className="mt-3 text-xs text-silver-dim">SKU: {order.items.map((i) => `${i.sku ?? "—"} ×${i.quantity}`).join(" · ")}</p>
            )}
            {order.customerNote && (
              <p className="mt-4 rounded-lg border border-line bg-ink-soft p-3 text-sm">
                <span className="text-silver">Nota del cliente:</span> {order.customerNote}
              </p>
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Comprador">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <User className="size-4 text-acma" /> {order.customerName}
                  {order.user ? (
                    <Link href={`/admin/clientes/${order.user.id}`} className="text-xs text-silver underline">
                      ({order.user._count.orders} pedidos)
                    </Link>
                  ) : (
                    <span className="text-xs text-silver-dim">invitado</span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="size-4 text-acma" />
                  <a href={`mailto:${order.email}`} className="hover:text-acma">
                    {order.email}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-acma" />
                  <a href={`tel:${order.customerPhone}`} className="hover:text-acma">
                    {order.customerPhone}
                  </a>
                </li>
              </ul>
            </Panel>
            <Panel title="Dirección de entrega">
              <div className="text-sm">
                <p className="font-medium">{order.shipFullName} · {order.shipPhone}</p>
                <p className="text-silver">
                  {order.shipLine1}
                  {order.shipLine2 && `, ${order.shipLine2}`}
                </p>
                <p className="text-silver">
                  {order.shipCity}, {order.shipState} {order.shipPostalCode ?? ""} · {order.shipCountry}
                </p>
                {order.shipNotes && <p className="mt-1 text-silver-dim">“{order.shipNotes}”</p>}
                <p className="mt-2 text-xs text-silver">Método: {order.shippingMethodName}</p>
              </div>
            </Panel>
          </div>

          <Panel title="Pagos y transacciones" description={order.paymentMethodName === PROVIDER_LABELS[order.paymentProvider] ? order.paymentMethodName : `${order.paymentMethodName} · ${PROVIDER_LABELS[order.paymentProvider]}`}>
            {order.paymentReference && <p className="mb-3 text-xs text-silver">Referencia en pasarela: {order.paymentReference}</p>}
            {order.transactions.length === 0 ? (
              <p className="text-sm text-silver">Sin eventos de pago registrados.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {order.transactions.map((t) => (
                  <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <PaymentStatusBadge status={t.status} /> <span className="ml-1 text-silver">{t.eventType}</span>
                    </span>
                    <span className="text-xs text-silver-dim">
                      {t.amountCents != null && `${formatMoney(t.amountCents, { currency: t.currency || order.currency, locale: settings.locale })} · `}
                      {t.externalId} · {formatDate(t.createdAt, settings.locale, true)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Historial">
            <ol className="space-y-3">
              {order.history.map((h) => (
                <li key={h.id} className="border-l-2 border-line pl-3 text-sm">
                  <p>
                    {[h.status && ORDER_STATUS_LABELS[h.status], h.paymentStatus && PAYMENT_STATUS_LABELS[h.paymentStatus]].filter(Boolean).join(" · ") || "Nota"}
                    <span className="ml-2 text-xs text-silver-dim">
                      {formatDate(h.createdAt, settings.locale, true)}
                      {h.createdBy ? ` · ${h.createdBy.name}` : " · sistema"}
                    </span>
                  </p>
                  {h.note && <p className={`text-xs ${h.note.startsWith("ATENCIÓN") ? "font-semibold text-acma" : "text-silver"}`}>{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Estado del pedido">
            <StatusForm orderId={order.id} allowed={allowed} />
          </Panel>
          <Panel title="Envío">
            <ShippingForm
              orderId={order.id}
              carrier={order.carrier ?? ""}
              trackingNumber={order.trackingNumber ?? ""}
              trackingUrl={order.trackingUrl ?? ""}
              canShip={allowed.includes("SHIPPED")}
            />
          </Panel>
          {order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED" && order.status !== "CANCELLED" && (
            <Panel title="Registrar pago">
              <RegisterPaymentForm orderId={order.id} online={online} />
            </Panel>
          )}
          {order.paymentStatus === "PAID" && (
            <Panel title="Reembolso">
              <RefundForm orderId={order.id} />
            </Panel>
          )}
          <Panel title="Nota interna">
            <AdminNoteForm orderId={order.id} note={order.adminNote ?? ""} />
          </Panel>
        </div>
      </div>
    </>
  );
}
