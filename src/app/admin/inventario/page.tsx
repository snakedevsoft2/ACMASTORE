import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Empty, PageHeader, Pagination, Panel, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber } from "@/lib/utils";
import { StockForm } from "./stock-form";

export const metadata = { title: "Inventario" };
const PER_PAGE = 40;
const REASONS = { INITIAL: "Stock inicial", ADJUSTMENT: "Ajuste", RESTOCK: "Reposición", ORDER: "Venta", ORDER_CANCELLED: "Cancelación" } as const;

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ q?: string; bajo?: string; pagina?: string }> }) {
  await requirePermission("products:manage");
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    trackStock: true,
    product: { status: { not: "ARCHIVED" } },
    ...(sp.bajo ? { stock: { lte: settings.lowStockThreshold } } : {}),
    ...(sp.q
      ? { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }] }
      : {}),
  };

  const [variants, total, totals, movements] = await Promise.all([
    db.productVariant.findMany({
      where,
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { product: { select: { id: true, name: true, status: true, _count: { select: { options: true } } } } },
    }),
    db.productVariant.count({ where }),
    db.productVariant.aggregate({ where: { isActive: true, trackStock: true, product: { status: "ACTIVE" } }, _sum: { stock: true } }),
    db.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        variant: { select: { name: true, product: { select: { id: true, name: true, _count: { select: { options: true } } } } } },
        order: { select: { id: true, number: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const href = (p: number) => `/admin/inventario?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.bajo ? { bajo: "1" } : {}), pagina: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Inventario"
        description={`${totals._sum.stock ?? 0} unidades en productos publicados con control de inventario. Umbral de inventario bajo: ${settings.lowStockThreshold}. Los productos “sin control de inventario” no aparecen aquí.`}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Producto o SKU" className={`${inputClass} max-w-sm`} />
        <label className="flex items-center gap-2 px-2 text-sm text-silver">
          <input type="checkbox" name="bajo" value="1" defaultChecked={Boolean(sp.bajo)} className="size-4 accent-[#E50914]" /> Solo inventario bajo
        </label>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      <div className="grid gap-6 2xl:grid-cols-[1fr_380px]">
        <div>
          {variants.length === 0 ? (
            <Empty>{sp.bajo ? "No hay variantes con inventario bajo." : "No hay variantes para mostrar."}</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th className="text-right">Stock actual</th>
                  <th className="text-right">Ajustar a</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/admin/productos/${v.product.id}`} className="hover:text-acma">
                        {v.product.name}
                        {v.product._count.options > 0 && <span className="text-silver"> · {v.name}</span>}
                      </Link>
                      {v.product.status === "DRAFT" && <span className="ml-2 text-xs text-silver-dim">(borrador)</span>}
                    </td>
                    <td className="text-silver">{v.sku ?? "—"}</td>
                    <td className={`text-right font-semibold tabular-nums ${v.stock === 0 ? "text-acma" : v.stock <= settings.lowStockThreshold ? "text-acma/80" : ""}`}>
                      {v.stock === 0 ? "Agotado" : v.stock}
                    </td>
                    <td>
                      <StockForm variantId={v.id} stock={v.stock} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={href} />
        </div>

        <Panel title="Movimientos recientes" description="Registro de entradas y salidas">
          {movements.length === 0 ? (
            <p className="text-sm text-silver">Sin movimientos registrados.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {movements.map((m) => (
                <li key={m.id} className="py-2.5">
                  <p>
                    <span className={`font-semibold tabular-nums ${m.delta > 0 ? "text-white" : "text-acma"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>{" "}
                    <Link href={`/admin/productos/${m.variant.product.id}`} className="hover:text-acma">
                      {m.variant.product.name}
                      {m.variant.product._count.options > 0 && ` · ${m.variant.name}`}
                    </Link>
                  </p>
                  <p className="text-xs text-silver-dim">
                    {REASONS[m.reason]}
                    {m.order && (
                      <>
                        {" · "}
                        <Link href={`/admin/pedidos/${m.order.id}`} className="underline">
                          {orderNumber(m.order.number)}
                        </Link>
                      </>
                    )}
                    {m.note && ` · ${m.note}`} · stock {m.stockAfter} · {formatDate(m.createdAt, settings.locale, true)}
                    {m.user && ` · ${m.user.name}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
