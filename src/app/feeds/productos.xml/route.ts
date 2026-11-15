import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { absoluteUrl, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;

/**
 * Feed de productos (formato Google Merchant / RSS 2.0). Sirve para:
 * - Google Merchant Center → anuncios de Shopping y Performance Max.
 * - Meta Commerce Manager → catálogo de Facebook/Instagram y anuncios dinámicos.
 * URL: /feeds/productos.xml
 */
export async function GET() {
  const [settings, products] = await Promise.all([
    getSettings(),
    db.product.findMany({
      where: { status: "ACTIVE", variants: { some: { isActive: true } }, images: { some: {} } },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, parent: { select: { name: true } } } },
        images: { orderBy: { sortOrder: "asc" }, take: 10 },
        options: { select: { id: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  const items: string[] = [];
  for (const p of products) {
    const link = siteUrl(`/producto/${p.slug}`);
    const [main, ...extra] = p.images.map((i) => absoluteUrl(i.url));
    const description = (p.shortDescription || p.description || p.name).replace(/\s+/g, " ").slice(0, 4900);
    const productType = [p.category?.parent?.name, p.category?.name].filter(Boolean).join(" > ");
    const grouped = p.options.length > 0 && p.variants.length > 1;

    for (const v of grouped ? p.variants : p.variants.slice(0, 1)) {
      const price = effectivePrice(p, grouped ? v : p.variants[0]);
      const available = !v.trackStock || v.stock > 0;
      const fields = [
        `<g:id>${esc(grouped ? v.id : p.id)}</g:id>`,
        `<g:title>${esc((grouped ? `${p.name} - ${v.name}` : p.name).slice(0, 150))}</g:title>`,
        `<g:description>${esc(description)}</g:description>`,
        `<g:link>${esc(link)}</g:link>`,
        `<g:image_link>${esc(main)}</g:image_link>`,
        ...extra.map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`),
        `<g:availability>${available ? "in_stock" : "out_of_stock"}</g:availability>`,
        price.compareAtCents
          ? `<g:price>${money(price.compareAtCents, settings.currency)}</g:price><g:sale_price>${money(price.priceCents, settings.currency)}</g:sale_price>`
          : `<g:price>${money(price.priceCents, settings.currency)}</g:price>`,
        `<g:condition>new</g:condition>`,
        `<g:brand>${esc(settings.storeName)}</g:brand>`,
        `<g:identifier_exists>no</g:identifier_exists>`,
        productType ? `<g:product_type>${esc(productType)}</g:product_type>` : "",
        grouped ? `<g:item_group_id>${esc(p.id)}</g:item_group_id>` : "",
        v.sku ? `<g:mpn>${esc(v.sku)}</g:mpn>` : "",
      ].filter(Boolean);
      items.push(`<item>${fields.join("")}</item>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(settings.storeName)}</title>
<link>${esc(siteUrl("/"))}</link>
<description>${esc(`${settings.storeName} — ${settings.slogan}`)}</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
