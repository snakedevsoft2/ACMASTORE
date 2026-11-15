import Link from "next/link";
import { Plus } from "lucide-react";
import { Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categorías" };

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<{ editar?: string; nueva?: string; guardado?: string; eliminada?: string }> }) {
  await requirePermission("products:manage");
  const sp = await searchParams;
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } }, parent: { select: { name: true } } },
  });
  // Principales primero, cada una seguida de sus subcategorías.
  const roots = categories.filter((c) => !c.parentId);
  const ordered = roots.flatMap((r) => [r, ...categories.filter((c) => c.parentId === r.id)]);
  const editing = sp.editar ? categories.find((c) => c.id === sp.editar) : null;
  const showForm = Boolean(editing || sp.nueva);

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza el catálogo. Admite categorías principales y subcategorías."
        actions={
          !showForm && (
            <ButtonLink href="/admin/categorias?nueva=1">
              <Plus className="size-4" /> Nueva categoría
            </ButtonLink>
          )
        }
      />
      {sp.guardado && <p className="mb-4 rounded-lg border border-line bg-carbon px-4 py-3 text-sm">Categoría guardada.</p>}
      {sp.eliminada && <p className="mb-4 rounded-lg border border-line bg-carbon px-4 py-3 text-sm">Categoría eliminada. Sus productos quedaron “Sin categoría”.</p>}

      <div className={showForm ? "grid gap-6 xl:grid-cols-[1fr_420px]" : ""}>
        <div>
          {ordered.length === 0 ? (
            <Empty>Aún no hay categorías. Crea la primera para organizar tus productos.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Enlace</th>
                  <th className="text-right">Productos</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ordered.map((c) => (
                  <tr key={c.id}>
                    <td className={c.parentId ? "pl-10" : "font-semibold"}>
                      {c.parentId && <span className="mr-1.5 text-silver-dim">└</span>}
                      {c.name}
                    </td>
                    <td className="text-silver">/tienda/{c.slug}</td>
                    <td className="text-right tabular-nums">{c._count.products}</td>
                    <td>{c.isActive ? <Badge tone="white">Visible</Badge> : <Badge tone="outline">Oculta</Badge>}</td>
                    <td className="text-right">
                      <Link href={`/admin/categorias?editar=${c.id}`} className="text-sm text-silver hover:text-white">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {showForm && (
          <div className="space-y-4">
            <Panel
              title={editing ? "Editar categoría" : "Nueva categoría"}
              actions={
                <Link href="/admin/categorias" className="text-sm text-silver hover:text-white">
                  Cerrar
                </Link>
              }
            >
              <CategoryForm
                key={editing?.id ?? "new"}
                parents={roots.map((r) => ({ id: r.id, name: r.name }))}
                values={
                  editing
                    ? {
                        id: editing.id,
                        name: editing.name,
                        slug: editing.slug,
                        description: editing.description ?? "",
                        parentId: editing.parentId ?? "",
                        sortOrder: editing.sortOrder,
                        isActive: editing.isActive,
                        imageUrl: editing.imageUrl,
                      }
                    : { name: "", slug: "", description: "", parentId: "", sortOrder: 0, isActive: true, imageUrl: null }
                }
              />
            </Panel>
            {editing && (
              <Panel title="Eliminar">
                <p className="mb-3 text-sm text-silver">
                  {editing._count.products > 0
                    ? `Sus ${editing._count.products} productos quedarán “Sin categoría” (no se eliminan).`
                    : "La categoría no tiene productos."}
                </p>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={editing.id} />
                  <Button variant="danger" size="sm">
                    Eliminar categoría
                  </Button>
                </form>
              </Panel>
            )}
          </div>
        )}
      </div>
    </>
  );
}
