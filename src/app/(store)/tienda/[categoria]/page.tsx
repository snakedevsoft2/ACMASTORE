import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { CatalogView, parseCatalogParams, type RawSearchParams } from "@/components/store/catalog-view";
import { getNavCategories } from "@/lib/catalog";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ categoria: string }>; searchParams: Promise<RawSearchParams> };

const getCategory = cache((slug: string) =>
  db.category.findFirst({ where: { slug, isActive: true }, include: { parent: { select: { name: true, slug: true } } } }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCategory((await params).categoria);
  if (!cat) return { title: "Categoría no encontrada" };
  const [stats, settings] = await Promise.all([
    db.product.aggregate({ where: { categoryId: cat.id, status: "ACTIVE" }, _count: true, _min: { priceCents: true } }),
    getSettings(),
  ]);
  const from = stats._min.priceCents != null ? formatMoney(stats._min.priceCents, { currency: settings.currency, locale: settings.locale }) : null;
  const description = `${cat.name} en ${settings.storeName}: ${stats._count} productos${from ? ` desde ${from}` : ""}. ${cat.description ?? ""} Compra en línea o sepáralos por WhatsApp.`.replace(/\s+/g, " ").trim();
  return {
    title: `${cat.name}${from ? ` desde ${from}` : ""}`,
    description,
    keywords: [cat.name, `${cat.name} precios`, `comprar ${cat.name.toLowerCase()}`, settings.storeName],
    alternates: { canonical: `/tienda/${cat.slug}` },
    openGraph: { title: cat.name, images: cat.imageUrl ? [cat.imageUrl] : undefined },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const [{ categoria }, sp, settings, categories] = await Promise.all([params, searchParams, getSettings(), getNavCategories()]);
  const cat = await getCategory(categoria);
  if (!cat) notFound();

  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Tienda", path: "/tienda" },
    ...(cat.parent ? [{ name: cat.parent.name, path: `/tienda/${cat.parent.slug}` }] : []),
    { name: cat.name, path: `/tienda/${cat.slug}` },
  ];

  return (
    <CatalogView
      params={{ ...parseCatalogParams(sp), category: cat.slug }}
      basePath={`/tienda/${cat.slug}`}
      title={cat.name}
      description={cat.description}
      categories={categories}
      activeCategory={cat.slug}
      money={{ currency: settings.currency, locale: settings.locale }}
      breadcrumb={<Breadcrumbs items={crumbs} />}
    />
  );
}
