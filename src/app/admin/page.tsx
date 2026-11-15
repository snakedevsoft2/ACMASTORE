import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, Circle, Clock, DollarSign, Package, ShoppingBag, Truck } from "lucide-react";
import { SalesChart, type DailySales } from "@/components/admin/sales-chart";
import { PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-parts";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { getAvailablePaymentMethods } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const TZ = process.env.STORE_TIMEZONE || "America/Bogota";

async function salesLast30Days(): Promise<DailySales[]> {
  const rows = await db.$queryRaw<Array<{ day: Date; cents: bigint; orders: bigint }>>`
    SELECT date_trunc('day', "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TZ}) AS day,
           SUM("totalCents")::bigint AS cents, COUNT(*)::bigint AS orders
      FROM "Order"
     WHERE "paymentStatus" = 'PAID' AND "paidAt" >= NOW() - INTERVAL '30 days'
  GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()) + "T00:00:00Z");
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    return { date: d, cents: r ? Number(r.cents) : 0, orders: r ? Number(r.orders) : 0 };
  });
}

export default async function DashboardPage() {
  await requirePermission("admin:access");
  const settings = await getSettings();
  const money = { currency: settings.currency, locale: settings.locale };
  const fmt = (c: number) => formatMoney(c, money);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [paid, paidMonth, ordersTotal, ordersMonth, pending, toShip, products, activeProducts, lowStock, lowStockCount, recentOrders, activity, daily, shippingCount, paymentsAvailable, pagesPending] =
    await Promise.all([
      db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalCents: true }, _count: true }),
      db.order.aggregate({ where: { paymentStatus: "PAID", paidAt: { gte: monthStart } }, _sum: { totalCents: true } }),
      db.order.count(),
      db.order.count({ where: { createdAt: { gte: monthStart } } }),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
      db.product.count({ where: { status: { not: "ARCHIVED" } } }),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.productVariant.findMany({
        where: { isActive: true, trackStock: true, stock: { lte: settings.lowStockThreshold }, product: { status: "ACTIVE" } },
        orderBy: { stock: "asc" },
        take: 6,
        include: { product: { select: { id: true, name: true, _count: { select: { options: true } } } } },
      }),
      db.productVariant.count({ where: { isActive: true, trackStock: true, stock: { lte: settings.lowStockThreshold }, product: { status: "ACTIVE" } } }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      db.orderStatusHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { order: { select: { id: true, number: true } }, createdBy: { select: { name: true } } },
      }),
      salesLast30Days(),
      db.shippingMethod.count({ where: { isActive: true } }),
      getAvailablePaymentMethods().then((m) => m.length),
      db.page.count({ where: { isReviewed: false, isPublished: true } }),
    ]);

  const checklist = [
    { done: products > 0, label: "Registrar productos", href: "/admin/productos/nuevo" },
    { done: shippingCount > 0, label: "Configurar al menos un método de envío", href: "/admin/configuracion/envios" },
    { done: paymentsAvailable > 0, label: "Activar al menos un método de pago", href: "/admin/configuracion/pagos" },
    { done: pagesPending === 0, label: `Redactar páginas legales e informativas (${pagesPending} pendientes)`, href: "/admin/paginas" },
    { done: Boolean(settings.whatsapp), label: "Agregar el WhatsApp de ventas (activa “Separar” y “Asesoría”)", href: "/admin/configuracion" },
    { done: Boolean(settings.instagramUrl || settings.facebookUrl), label: "Conectar Instagram y Facebook", href: "/admin/configuracion" },
    { done: Boolean(settings.contactEmail && settings.contactPhone), label: "Completar datos de contacto", href: "/admin/configuracion" },
    { done: isEmailConfigured(), label: "Configurar correo SMTP (variables de entorno)", href: "/admin/configuracion" },
  ];
  const pendingChecklist = checklist.filter((c) => !c.done);

  return (
    <>
      <PageHeader title="Dashboard" description={`Resumen de la actividad comercial de ${settings.storeName}.`} />

      {pendingChecklist.length > 0 && (
        <Panel title="Antes de vender" description="Tareas pendientes para operar la tienda" className="mb-6 border-acma/40">
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                  {c.done ? <CheckCircle2 className="size-4 text-silver-dim" /> : <Circle className="size-4 text-acma" />}
                  <span className={c.done ? "text-silver-dim line-through" : "text-white"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas totales" value={fmt(paid._sum.totalCents ?? 0)} hint={`Este mes: ${fmt(paidMonth._sum.totalCents ?? 0)} · solo pagos confirmados`} icon={<DollarSign />} />
        <StatCard label="Pedidos recibidos" value={ordersTotal} hint={`Este mes: ${ordersMonth}`} icon={<ShoppingBag />} href="/admin/pedidos" />
        <StatCard
          label="Pedidos pendientes"
          value={pending}
          hint={`${toShip} confirmados por despachar`}
          icon={<Clock />}
          tone={pending > 0 ? "alert" : "default"}
          href="/admin/pedidos?estado=PENDING"
        />
        <StatCard label="Productos registrados" value={products} hint={`${activeProducts} publicados`} icon={<Package />} href="/admin/productos" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Ventas de los últimos 30 días" description="Pedidos con pago confirmado, por día">
          <SalesChart data={daily} money={money} />
        </Panel>
        <Panel
          title="Inventario bajo"
          description={`Variantes con ${settings.lowStockThreshold} unidades o menos`}
          actions={
            <Link href="/admin/inventario?bajo=1" className="text-xs text-silver hover:text-white">
              Ver todo ({lowStockCount})
            </Link>
          }
        >
          {lowStock.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-silver">
              <Boxes className="size-4 text-acma" /> No hay productos con inventario bajo.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <AlertTriangle className={`size-4 shrink-0 ${v.stock === 0 ? "text-acma" : "text-silver"}`} />
                  <Link href={`/admin/productos/${v.product.id}`} className="min-w-0 flex-1 truncate hover:text-acma">
                    {v.product.name}
                    {v.product._count.options > 0 && <span className="text-silver"> · {v.name}</span>}
                  </Link>
                  <span className={`font-semibold tabular-nums ${v.stock === 0 ? "text-acma" : ""}`}>{v.stock === 0 ? "Agotado" : `${v.stock} u.`}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Pedidos recientes"
          actions={
            <Link href="/admin/pedidos" className="text-xs text-silver hover:text-white">
              Ver todos
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <p className="text-sm text-silver">Todavía no se han recibido pedidos.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="group flex items-center gap-4 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-acma">{orderNumber(o.number)}</span>
                      <span className="block truncate text-xs text-silver">{o.customerName}</span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.paymentStatus} />
                    </span>
                    <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-white">{formatMoney(o.totalCents, { currency: o.currency, locale: settings.locale })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Actividad reciente">
          {activity.length === 0 ? (
            <p className="text-sm text-silver">Sin actividad todavía.</p>
          ) : (
            <ol className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <Truck className="mt-0.5 size-4 shrink-0 text-acma" />
                  <div className="min-w-0">
                    <p>
                      <Link href={`/admin/pedidos/${a.order.id}`} className="font-semibold hover:text-acma">
                        {orderNumber(a.order.number)}
                      </Link>{" "}
                      <span className="text-silver">
                        {[a.status && ORDER_STATUS_LABELS[a.status], a.paymentStatus && PAYMENT_STATUS_LABELS[a.paymentStatus]].filter(Boolean).join(" · ") || "Nota"}
                      </span>
                    </p>
                    {a.note && <p className="truncate text-xs text-silver-dim">{a.note}</p>}
                    <p className="text-xs text-silver-dim">
                      {formatDate(a.createdAt, settings.locale, true)}
                      {a.createdBy && ` · ${a.createdBy.name}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
