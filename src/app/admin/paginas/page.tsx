import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Páginas" };

export default async function PaginasPage() {
  await requirePermission("content:manage");
  const [pages, settings] = await Promise.all([db.page.findMany({ orderBy: { title: "asc" } }), getSettings()]);
  return (
    <>
      <PageHeader
        title="Páginas"
        description="Contenido del footer: Nosotros, contacto, preguntas frecuentes y políticas. Las páginas sin revisar no se indexan en buscadores."
      />
      <Table>
        <thead>
          <tr>
            <th>Página</th>
            <th>URL</th>
            <th>Estado</th>
            <th>Actualizada</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">
                <Link href={`/admin/paginas/${p.id}`} className="hover:text-acma">
                  {p.title}
                </Link>
              </td>
              <td>
                <Link href={`/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-silver hover:text-white">
                  /{p.slug} <ExternalLink className="size-3" />
                </Link>
              </td>
              <td className="space-x-1">
                {!p.isReviewed ? <Badge tone="red">Pendiente de redactar</Badge> : <Badge tone="white">Revisada</Badge>}
                {!p.isPublished && <Badge tone="dark">Oculta</Badge>}
              </td>
              <td className="text-silver">{formatDate(p.updatedAt, settings.locale)}</td>
              <td className="text-right">
                <Link href={`/admin/paginas/${p.id}`} className="text-sm text-silver hover:text-white">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
