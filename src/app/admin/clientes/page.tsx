import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Empty, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Clientes" };
const PER_PAGE = 30;

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requirePermission("customers:view");
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.pagina) || 1);
  const q = sp.q?.trim();
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { _count: { select: { orders: true } } } }),
    db.user.count({ where }),
  ]);
  const spent = customers.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { userId: { in: customers.map((c) => c.id) }, paymentStatus: "PAID" },
        _sum: { totalCents: true },
      })
    : [];
  const spentBy = new Map(spent.map((s) => [s.userId, s._sum.totalCents ?? 0]));
  const guestBuyers = await db.order.groupBy({ by: ["email"], where: { userId: null } }).then((r) => r.length);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${total} clientes registrados · ${guestBuyers} compradores invitados (sus pedidos están en Pedidos)`}
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Nombre, correo o teléfono" className={`${inputClass} max-w-md`} />
        <button className={buttonClass("secondary")}>Buscar</button>
      </form>
      {customers.length === 0 ? (
        <Empty>{q ? "No hay clientes que coincidan." : "Aún no hay clientes registrados."}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Registro</th>
              <th className="text-right">Pedidos</th>
              <th className="text-right">Total pagado</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:text-acma">
                    {c.name}
                  </Link>
                  {!c.isActive && <span className="ml-2 text-xs text-acma">desactivado</span>}
                </td>
                <td className="text-silver">
                  {c.email}
                  {c.phone && <span className="block text-xs">{c.phone}</span>}
                </td>
                <td className="text-silver">{formatDate(c.createdAt, settings.locale)}</td>
                <td className="text-right tabular-nums">{c._count.orders}</td>
                <td className="text-right tabular-nums">{formatMoney(spentBy.get(c.id) ?? 0, { currency: settings.currency, locale: settings.locale })}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={(p) => `/admin/clientes?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(p) })}`} />
    </>
  );
}
