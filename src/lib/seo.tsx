import type { StoreSettings } from "@prisma/client";
import { absoluteUrl, siteUrl } from "@/lib/utils";

/** Inserta datos estructurados schema.org. Escapa "<" para evitar cierre prematuro del script. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationJsonLd(s: StoreSettings) {
  const sameAs = [s.instagramUrl, s.facebookUrl, s.tiktokUrl, s.xUrl, s.youtubeUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: s.storeName,
    slogan: s.slogan,
    url: siteUrl("/"),
    ...(s.logoUrl ? { logo: absoluteUrl(s.logoUrl) } : {}),
    ...(s.contactEmail ? { email: s.contactEmail } : {}),
    ...(s.contactPhone ? { telephone: s.contactPhone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl("/tienda")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: siteUrl(it.path),
    })),
  };
}

export function productJsonLd(p: {
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  sku: string | null;
  category: string | null;
  brand: string;
  currency: string;
  variants: Array<{ priceCents: number; available: boolean; sku: string | null; name: string }>;
}) {
  const prices = p.variants.map((v) => v.priceCents / 100);
  const inStock = p.variants.some((v) => v.available);
  const priceValidUntil = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const url = siteUrl(`/producto/${p.slug}`);
  const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? undefined,
    image: p.images.map((i) => absoluteUrl(i)),
    sku: p.sku ?? undefined,
    category: p.category ?? undefined,
    brand: { "@type": "Brand", name: p.brand },
    url,
    offers:
      p.variants.length > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: p.currency,
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: p.variants.length,
            availability,
            url,
            seller: { "@type": "Organization", name: p.brand },
          }
        : {
            "@type": "Offer",
            priceCurrency: p.currency,
            price: prices[0] ?? 0,
            priceValidUntil,
            availability,
            url,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: p.brand },
          },
  };
}
