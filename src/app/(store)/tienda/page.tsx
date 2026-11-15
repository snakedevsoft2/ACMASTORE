import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogView, parseCatalogParams, type RawSearchParams } from "@/components/store/catalog-view";
import { getNavCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { TrackOnMount } from "@/components/analytics";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const p = parseCatalogParams(await searchParams);
  const filtered = Boolean(p.q || p.min != null || p.max != null || p.inStock || (p.page ?? 1) > 1 || p.sort !== "relevancia");
  return {
    title: p.q ? `Resultados para “${p.q}”` : p.offers ? "Ofertas" : "Tienda",
    description: "Explora el catálogo completo de ACMA STORE: filtra por categoría y precio y compra en línea.",
    alternates: { canonical: p.offers ? "/tienda?ofertas=1" : "/tienda" },
    // Las combinaciones de filtros no se indexan para evitar contenido duplicado.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function TiendaPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [sp, settings, categories] = await Promise.all([searchParams, getSettings(), getNavCategories()]);
  const params = parseCatalogParams(sp);
  const title = params.q ? `Búsqueda: ${params.q}` : params.offers ? "Ofertas especiales" : params.sort === "nuevos" ? "Novedades" : "Tienda";

  return (
    <>
    {params.q && <TrackOnMount event="search" params={{ search_term: params.q }} />}
    <CatalogView
      params={params}
      basePath="/tienda"
      title={title}
      description={params.q ? null : "Todo en un solo lugar. Filtra, compara y compra en minutos."}
      categories={categories}
      activeCategory={params.category}
      money={{ currency: settings.currency, locale: settings.locale }}
      breadcrumb={<Breadcrumbs items={[{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/tienda" }]} />}
    />
    </>
  );
}
