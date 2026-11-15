import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, pages] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", variants: { some: { isActive: true } } },
      select: { slug: true, updatedAt: true, images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ where: { isPublished: true, isReviewed: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/tienda"), changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: siteUrl(`/tienda/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: siteUrl(`/producto/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images.map((i) => absoluteUrl(i.url)),
    })),
    ...pages.map((p) => ({ url: siteUrl(`/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
