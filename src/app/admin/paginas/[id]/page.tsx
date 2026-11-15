import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/ui";
import { RichText } from "@/components/rich-text";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageForm } from "../../content-forms";

export const metadata = { title: "Editar página" };

export default async function EditarPaginaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("content:manage");
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  return (
    <>
      <PageHeader title={page.title} back={{ href: "/admin/paginas", label: "Páginas" }} description={`/${page.slug}`} />
      {!page.isReviewed && (
        <p className="mb-6 rounded-lg border border-acma/40 bg-acma/10 p-3 text-sm">
          Esta página aún tiene el texto provisional. Los textos legales (privacidad, términos, envíos, devoluciones) deben reflejar las condiciones reales de tu negocio y la normativa de tu país; te recomendamos revisarlos con un asesor.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Editar">
          <PageForm page={page} />
        </Panel>
        <Panel title="Vista previa (versión guardada)">
          <RichText content={page.content} />
        </Panel>
      </div>
    </>
  );
}
