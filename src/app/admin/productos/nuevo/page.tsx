import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ProductForm } from "../product-form";

export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await requirePermission("products:manage");
  const [categories, settings] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { parent: { select: { name: true } } } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Nuevo producto" back={{ href: "/admin/productos", label: "Productos" }} />
      <ProductForm
        currency={settings.currency}
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name ?? null }))}
        values={{
          name: "",
          slug: "",
          shortDescription: "",
          description: "",
          categoryId: "",
          status: "DRAFT",
          price: "",
          compareAt: "",
          isFeatured: false,
          trackStock: true,
          seoTitle: "",
          seoDescription: "",
          options: [],
          variants: [],
        }}
      />
    </>
  );
}
