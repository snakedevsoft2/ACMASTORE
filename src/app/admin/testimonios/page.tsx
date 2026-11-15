import Link from "next/link";
import { Star } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteTestimonialAction } from "../contenido-actions";
import { TestimonialForm } from "../content-forms";

export const metadata = { title: "Testimonios" };

export default async function TestimoniosPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requirePermission("content:manage");
  const sp = await searchParams;
  const items = await db.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const editing = sp.editar ? items.find((t) => t.id === sp.editar) : undefined;
  return (
    <>
      <PageHeader
        title="Testimonios"
        description="Opiniones de clientes reales para la página de inicio. Si no hay testimonios activos, la sección no se muestra."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-3">
          {items.length === 0 ? (
            <Empty>Aún no hay testimonios.</Empty>
          ) : (
            items.map((t) => (
              <article key={t.id} className="rounded-xl border border-line bg-carbon p-4">
                <div className="mb-2 flex items-center gap-2">
                  <strong>{t.author}</strong>
                  {t.location && <span className="text-sm text-silver">· {t.location}</span>}
                  <span className="flex" aria-label={`${t.rating} estrellas`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-acma text-acma" />
                    ))}
                  </span>
                  {!t.isActive && <Badge tone="dark">Oculto</Badge>}
                </div>
                <p className="text-sm text-silver">{t.content}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/admin/testimonios?editar=${t.id}`} className="text-sm text-silver hover:text-white">
                    Editar
                  </Link>
                  <form action={deleteTestimonialAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <Button variant="ghost" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
        <Panel title={editing ? "Editar testimonio" : "Nuevo testimonio"}>
          <TestimonialForm key={editing?.id ?? "new"} t={editing} />
        </Panel>
      </div>
    </>
  );
}
