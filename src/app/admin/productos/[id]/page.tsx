import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { deleteProductAction } from "../actions";
import { ProductForm } from "../product-form";
import { ImageManager } from "./image-manager";

export const metadata = { title: "Editar producto" };

const REASONS = { INITIAL: "Stock inicial", ADJUSTMENT: "Ajuste", RESTOCK: "Reposición", ORDER: "Venta", ORDER_CANCELLED: "Pedido cancelado" } as const;

export default async function EditarProductoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string; fotos?: string }> }) {
  await requirePermission("products:manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories, settings] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { orderItems: true } },
      },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { parent: { select: { name: true } } } }),
    getSettings(),
  ]);
  if (!product) notFound();

  const movements = await db.inventoryMovement.findMany({
    where: { variant: { productId: id } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { variant: { select: { name: true } }, user: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title={product.name}
        back={{ href: "/admin/productos", label: "Productos" }}
        actions={
          product.status === "ACTIVE" ? (
            <Link href={`/producto/${product.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-silver hover:text-white">
              Ver en la tienda <ExternalLink className="size-4" />
            </Link>
          ) : undefined
        }
      />
      {sp.creado && (
        <p className="mb-4 rounded-lg border border-line-strong bg-carbon px-4 py-3 text-sm">
          Producto creado{product.status === "DRAFT" ? " como borrador. Cambia el estado a “Publicado” para mostrarlo en la tienda." : "."}
          {sp.fotos && " Algunas fotos no se pudieron procesar; súbelas de nuevo abajo."}
        </p>
      )}

      <Panel title="Fotografías" description="La primera foto es la principal. Máximo 12." className="mb-6">
        <ImageManager productId={product.id} images={product.images.map((i) => ({ id: i.id, url: i.url }))} />
      </Panel>

      <ProductForm
        currency={settings.currency}
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name ?? null }))}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          status: product.status,
          price: centsToInput(product.priceCents),
          compareAt: centsToInput(product.compareAtCents),
          isFeatured: product.isFeatured,
          trackStock: product.variants.length === 0 || product.variants.some((v) => v.trackStock),
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          options: product.options.map((o) => ({ name: o.name, values: o.values })),
          variants: product.variants
            .filter((v) => {
              const opts = (v.options ?? {}) as Record<string, string>;
              // Solo variantes coherentes con las opciones vigentes; las retiradas con ventas quedan fuera.
              if (product.options.length === 0) return v.isActive && Object.keys(opts).length === 0;
              return (
                Object.keys(opts).length === product.options.length &&
                product.options.every((o) => o.values.includes(opts[o.name] ?? ""))
              );
            })
            .map((v) => ({
              id: v.id,
              options: (v.options ?? {}) as Record<string, string>,
              sku: v.sku ?? "",
              price: centsToInput(v.priceCents),
              compareAt: centsToInput(v.compareAtCents),
              stock: String(v.stock),
              isActive: v.isActive,
            })),
        }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Últimos movimientos de inventario">
          {movements.length === 0 ? (
            <p className="text-sm text-silver">Sin movimientos.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    <span className={m.delta > 0 ? "text-white" : "text-acma"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>{" "}
                    <span className="text-silver">
                      {REASONS[m.reason]}
                      {product.options.length > 0 && ` · ${m.variant.name}`}
                    </span>
                  </span>
                  <span className="text-xs text-silver-dim">
                    Stock: {m.stockAfter} · {formatDate(m.createdAt, settings.locale, true)}
                    {m.user && ` · ${m.user.name}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Eliminar producto">
          <p className="mb-4 text-sm text-silver">
            {product._count.orderItems > 0
              ? `Este producto aparece en ${product._count.orderItems} líneas de pedidos. Al eliminarlo se archivará para conservar el historial.`
              : "Se eliminará el producto con sus variantes y fotos. Esta acción no se puede deshacer."}
          </p>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <Button variant="danger" size="sm">
              {product._count.orderItems > 0 ? "Archivar producto" : "Eliminar producto"}
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
