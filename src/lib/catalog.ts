import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/pricing";

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = {
  relevancia: "Relevancia",
  popular: "Más vendidos",
  nuevos: "Novedades",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  priceCents: true,
  compareAtCents: true,
  isFeatured: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
  variants: {
    where: { isActive: true },
    select: { id: true, stock: true, trackStock: true, priceCents: true, compareAtCents: true },
    orderBy: { sortOrder: "asc" },
  },
  options: { select: { id: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  priceCents: number;
  compareAtCents: number | null;
  /** Hay variantes con precios distintos: mostrar "Desde". */
  priceVaries: boolean;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  categoryName: string | null;
  categorySlug: string | null;
  /** Se puede comprar: alguna variante con stock o sin control de inventario. */
  available: boolean;
  /** Unidades restantes si el inventario se controla y quedan pocas; si no, null. */
  lowStock: number | null;
  /** Id de variante si el producto no tiene opciones (se puede agregar directo al carrito). */
  quickAddVariantId: string | null;
};

const LOW_STOCK_BADGE = 5;

function toCard(p: CardRow): ProductCardData {
  const prices = p.variants.map((v) => effectivePrice(p, v));
  const cheapest = prices.length ? prices.reduce((a, b) => (b.priceCents < a.priceCents ? b : a)) : effectivePrice(p);
  const untracked = p.variants.some((v) => !v.trackStock);
  const trackedStock = p.variants.filter((v) => v.trackStock).reduce((s, v) => s + Math.max(v.stock, 0), 0);
  const available = untracked || trackedStock > 0;
  const single = p.options.length === 0 && p.variants.length === 1 ? p.variants[0] : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    priceCents: cheapest.priceCents,
    compareAtCents: cheapest.compareAtCents,
    priceVaries: new Set(prices.map((x) => x.priceCents)).size > 1,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt || p.name } : null,
    hoverImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt || p.name } : null,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    available,
    lowStock: !untracked && trackedStock > 0 && trackedStock <= LOW_STOCK_BADGE ? trackedStock : null,
    quickAddVariantId: single && (!single.trackStock || single.stock > 0) ? single.id : null,
  };
}

const visible: Prisma.ProductWhereInput = { status: "ACTIVE", variants: { some: { isActive: true } } };

export type CatalogParams = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: SortKey;
  page?: number;
  inStock?: boolean;
  offers?: boolean;
};

export async function searchProducts(params: CatalogParams) {
  const where: Prisma.ProductWhereInput = { AND: [visible] };
  const and = where.AND as Prisma.ProductWhereInput[];

  if (params.q) {
    const q = params.q.slice(0, 80);
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { variants: { some: { sku: { equals: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (params.category) {
    const cat = await db.category.findUnique({
      where: { slug: params.category },
      select: { id: true, children: { select: { id: true } } },
    });
    and.push({ categoryId: { in: cat ? [cat.id, ...cat.children.map((c) => c.id)] : [] } });
  }
  if (params.min != null) and.push({ priceCents: { gte: params.min } });
  if (params.max != null) and.push({ priceCents: { lte: params.max } });
  if (params.inStock) {
    and.push({ variants: { some: { isActive: true, OR: [{ trackStock: false }, { stock: { gt: 0 } }] } } });
  }
  if (params.offers) and.push({ compareAtCents: { not: null } });

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
    switch (params.sort) {
      case "popular":
        return [{ salesCount: "desc" }, { createdAt: "desc" }];
      case "nuevos":
        return [{ createdAt: "desc" }];
      case "precio-asc":
        return [{ priceCents: "asc" }];
      case "precio-desc":
        return [{ priceCents: "desc" }];
      default:
        return [{ isFeatured: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }];
    }
  })();

  const page = Math.max(1, params.page ?? 1);
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, select: cardSelect, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  let items = rows.map(toCard);
  // El filtro de ofertas en BD es aproximado (compareAt ≥ precio); se depura aquí.
  if (params.offers) items = items.filter((i) => i.compareAtCents != null);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Secciones de la página de inicio. Todas leen datos reales; si no hay, devuelven []. */
export async function getHomeSections() {
  const take = 8;
  const [featured, newest, bestSellers, offers] = await Promise.all([
    db.product.findMany({ where: { ...visible, isFeatured: true }, orderBy: { updatedAt: "desc" }, select: cardSelect, take }),
    db.product.findMany({ where: visible, orderBy: { createdAt: "desc" }, select: cardSelect, take }),
    db.product.findMany({
      where: { ...visible, salesCount: { gt: 0 } },
      orderBy: { salesCount: "desc" },
      select: cardSelect,
      take,
    }),
    db.product.findMany({
      where: { ...visible, compareAtCents: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: cardSelect,
      take: take * 2,
    }),
  ]);
  return {
    featured: featured.map(toCard),
    newest: newest.map(toCard),
    bestSellers: bestSellers.map(toCard),
    offers: offers.map(toCard).filter((p) => p.compareAtCents != null).slice(0, take),
  };
}

/** Categorías con su cantidad de productos y una foto representativa (para la portada y la tienda). */
export const getCategoryShowcase = cache(async () => {
  const rows = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      _count: { select: { products: { where: visible } } },
      products: {
        where: visible,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
      },
    },
  });
  return rows
    .filter((c) => c._count.products > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c._count.products,
      imageUrl: c.imageUrl ?? c.products[0]?.images[0]?.url ?? null,
    }));
});

export type CategoryShowcase = Awaited<ReturnType<typeof getCategoryShowcase>>[number];

/** Productos para las pestañas del catálogo en la portada (todas las categorías). */
export async function getCatalogForTabs(limit = 400): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: visible,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: cardSelect,
    take: limit,
  });
  return rows.map(toCard);
}

export const getNavCategories = cache(() =>
  db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      description: true,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true },
      },
      _count: { select: { products: { where: visible } } },
    },
  }),
);

export const getProductBySlug = cache((slug: string) =>
  db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      options: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  }),
);

export async function getRelatedProducts(productId: string, categoryId: string | null) {
  if (!categoryId) return [];
  const rows = await db.product.findMany({
    where: { ...visible, categoryId, id: { not: productId } },
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    select: cardSelect,
    take: 4,
  });
  return rows.map(toCard);
}

export async function getCatalogPriceBounds() {
  const agg = await db.product.aggregate({ where: visible, _min: { priceCents: true }, _max: { priceCents: true } });
  return { min: agg._min.priceCents ?? 0, max: agg._max.priceCents ?? 0 };
}
