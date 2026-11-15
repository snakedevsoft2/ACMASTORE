import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { Empty, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-parts";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, orderNumber, parseOrderNumber } from "@/lib/utils";
import { ExpireButton } from "./order-forms";

export const metadata = { title: "Pedidos" };
const PER_PAGE = 30;

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; pago?: string; pagina?: string }> }) {
  await requirePermission("orders:manage");
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.pagina) || 1);
  const status = sp.estado && sp.estado in ORDER_STATUS_LABELS ? (sp.estado as OrderStatus) : undefined;
  const payment = sp.pago && sp.pago in PAYMENT_STATUS_LABELS ? (sp.pago as PaymentStatus) : undefined;
  const q = sp.q?.trim();
  const num = q ? parseOrderNumber(q) : null;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q
      ? {
          OR: [
            ...(num ? [{ number: num }] : []),
            { email: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { customerPhone: { contains: q } },
          ],
        }
      : {}),
  };

  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const tabHref = (s?: string) => (s ? `/admin/pedidos?estado=${s}` : "/admin/pedidos");
  const href = (p: number) => `/admin/pedidos?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { estado: status } : {}), ...(payment ? { pago: payment } : {}), pagina: String(p) })}`;

  return (
    <>
      <PageHeader title="Pedidos" description={`${total} ${total === 1 ? "pedido" : "pedidos"}`} actions={<ExpireButton />} />

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Filtrar por estado">
        {[undefined, ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[])].map((s) => (
          <Link
            key={s ?? "all"}
            href={tabHref(s)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
              status === s ? "border-acma font-semibold text-white" : "border-transparent text-silver hover:text-white",
            )}
          >
            {s ? ORDER_STATUS_LABELS[s] : "Todos"}
            {s && <span className="ml-1.5 text-xs text-silver-dim">{countOf(s)}</span>}
          </Link>
        ))}
      </nav>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        {status && <input type="hidden" name="estado" value={status} />}
        <input name="q" defaultValue={q} placeholder="Número, correo, nombre o teléfono" className={inputClass} />
        <select name="pago" defaultValue={payment ?? ""} className={inputClass}>
          <option value="">Cualquier estado de pago</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className={buttonClass("secondary")}>Buscar</button>
      </form>

      {orders.length === 0 ? (
        <Empty>{q || status || payment ? "No hay pedidos con esos filtros." : "Todavía no se han recibido pedidos."}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Pago</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:text-acma">
                    {orderNumber(o.number)}
                  </Link>
                  <span className="block text-xs text-silver-dim">{o._count.items} productos</span>
                </td>
                <td className="whitespace-nowrap text-silver">{formatDate(o.createdAt, settings.locale, true)}</td>
                <td>
                  {o.customerName}
                  <span className="block text-xs text-silver-dim">{o.email}{!o.userId && " · invitado"}</span>
                </td>
                <td>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td>
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <span className="block text-xs text-silver-dim">{o.paymentMethodName}</span>
                </td>
                <td className="text-right font-semibold tabular-nums">{formatMoney(o.totalCents, { currency: o.currency, locale: settings.locale })}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={href} />
    </>
  );
}
