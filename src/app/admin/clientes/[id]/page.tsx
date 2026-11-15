import Link from "next/link";
import { notFound } from "next/navigation";
import { DollarSign, Mail, MapPin, Phone, Receipt, ShoppingBag } from "lucide-react";
import { PageHeader, Panel, StatCard, Table } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-parts";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";

export const metadata = { title: "Cliente" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers:view");
  const { id } = await params;
  const [user, settings] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: { addresses: { orderBy: { isDefault: "desc" } }, orders: { orderBy: { createdAt: "desc" }, take: 50 } },
    }),
    getSettings(),
  ]);
  if (!user) notFound();
  const paid = user.orders.filter((o) => o.paymentStatus === "PAID");
  const totalPaid = paid.reduce((s, o) => s + o.totalCents, 0);
  const money = { currency: settings.currency, locale: settings.locale };

  return (
    <>
      <PageHeader title={user.name} back={{ href: "/admin/clientes", label: "Clientes" }} description={`Cliente desde ${formatDate(user.createdAt, settings.locale)}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pedidos" value={user.orders.length} icon={<ShoppingBag />} />
        <StatCard label="Total pagado" value={formatMoney(totalPaid, money)} icon={<DollarSign />} />
        <StatCard label="Ticket promedio" value={paid.length ? formatMoney(Math.round(totalPaid / paid.length), money) : "—"} icon={<Receipt />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel title="Pedidos">
          {user.orders.length === 0 ? (
            <p className="text-sm text-silver">Sin pedidos.</p>
          ) : (
            <Table className="border-0">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {user.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:text-acma">
                        {orderNumber(o.number)}
                      </Link>
                    </td>
                    <td className="text-silver">{formatDate(o.createdAt, settings.locale)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td><PaymentStatusBadge status={o.paymentStatus} /></td>
                    <td className="text-right tabular-nums">{formatMoney(o.totalCents, { currency: o.currency, locale: settings.locale })}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Contacto">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="size-4 text-acma" /> <a href={`mailto:${user.email}`} className="hover:text-acma">{user.email}</a></li>
              <li className="flex items-center gap-2"><Phone className="size-4 text-acma" /> {user.phone ?? "—"}</li>
            </ul>
          </Panel>
          <Panel title="Direcciones">
            {user.addresses.length === 0 ? (
              <p className="text-sm text-silver">Sin direcciones guardadas.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {user.addresses.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-acma" />
                    <span>
                      {a.label && <strong>{a.label} · </strong>}
                      {a.line1}, {a.city}, {a.state}
                      {a.isDefault && <span className="ml-1 text-xs text-acma">principal</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
