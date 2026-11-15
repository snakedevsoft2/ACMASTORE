import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import type { Prisma, ProductStatus } from "@prisma/client";
import { Empty, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Productos" };

const STATUS: Record<ProductStatus, { label: string; tone: "white" | "outline" | "dark" }> = {
  ACTIVE: { label: "Publicado", tone: "white" },
  DRAFT: { label: "Borrador", tone: "outline" },
  ARCHIVED: { label: "Archivado", tone: "dark" },
};
const PER_PAGE = 25;

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; categoria?: string; pagina?: string; eliminado?: string; archivado?: string }>;
}) {
  await requirePermission("products:manage");
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.pagina) || 1);
  const status = sp.estado && sp.estado in STATUS ? (sp.estado as ProductStatus) : undefined;

  const where: Prisma.ProductWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }] } : {}),
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    ...(sp.categoria ? { categoryId: sp.categoria } : {}),
  };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
        variants: { where: { isActive: true }, select: { stock: true, trackStock: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const money = { currency: settings.currency, locale: settings.locale };
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.estado) u.set("estado", sp.estado);
    if (sp.categoria) u.set("categoria", sp.categoria);
    u.set("pagina", String(p));
    return `/admin/productos?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Productos"
        description={`${total} ${total === 1 ? "producto" : "productos"}`}
        actions={
          <ButtonLink href="/admin/productos/nuevo">
            <Plus className="size-4" /> Nuevo producto
          </ButtonLink>
        }
      />
      {sp.eliminado && <p className="mb-4 rounded-lg border border-line bg-carbon px-4 py-3 text-sm">Producto eliminado.</p>}
      {sp.archivado && (
        <p className="mb-4 rounded-lg border border-line bg-carbon px-4 py-3 text-sm">
          El producto tiene ventas registradas, así que se <strong>archivó</strong> en lugar de eliminarse para conservar el historial de pedidos.
        </p>
      )}

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_200px_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre o SKU" className={inputClass} />
        <select name="estado" defaultValue={sp.estado ?? ""} className={inputClass}>
          <option value="">Activos y borradores</option>
          <option value="ACTIVE">Publicados</option>
          <option value="DRAFT">Borradores</option>
          <option value="ARCHIVED">Archivados</option>
        </select>
        <select name="categoria" defaultValue={sp.categoria ?? ""} className={inputClass}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={buttonClass("secondary")}>Filtrar</button>
      </form>

      {products.length === 0 ? (
        <Empty>
          {sp.q || sp.estado || sp.categoria ? "No hay productos con esos filtros." : "Aún no hay productos. Crea el primero con “Nuevo producto”."}
        </Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th className="text-right">Precio</th>
              <th className="text-right">Stock</th>
              <th className="text-right">Vendidos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const untracked = p.variants.length > 0 && p.variants.every((v) => !v.trackStock);
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3 hover:text-acma">
                      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-soft text-line-strong">
                        {p.images[0] ? <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" /> : <ImageOff className="size-4" />}
                      </span>
                      <span className="font-medium">
                        {p.name}
                        {p.isFeatured && <span className="ml-2 text-xs text-acma">★ Destacado</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="text-silver">{p.category?.name ?? "—"}</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(p.priceCents, money)}
                    {p.compareAtCents && <span className="block text-xs text-silver-dim line-through">{formatMoney(p.compareAtCents, money)}</span>}
                  </td>
                  <td className={`text-right tabular-nums ${!untracked && stock <= settings.lowStockThreshold ? "font-semibold text-acma" : ""}`}>
                    {untracked ? <span className="text-xs text-silver-dim">Sin control</span> : stock}
                  </td>
                  <td className="text-right tabular-nums text-silver">{p.salesCount}</td>
                  <td>
                    <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PER_PAGE)} href={qs} />
    </>
  );
}
