import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { TrackOnMount } from "@/components/analytics";
import { RichText } from "@/components/rich-text";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-card";
import { ProductPurchase, type PurchaseVariant } from "@/components/store/product-purchase";
import { Container, SectionHeading } from "@/components/ui/misc";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { effectivePrice } from "@/lib/pricing";
import { JsonLd, productJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: "Producto no encontrado" };
  const [settings, image] = [await getSettings(), p.images[0]];
  const variants = p.variants.map((v) => effectivePrice(p, v).priceCents);
  const minPrice = variants.length ? Math.min(...variants) : p.priceCents;
  const priceText = formatMoney(minPrice, { currency: settings.currency, locale: settings.locale });
  const description =
    p.seoDescription ||
    `${p.name} por ${priceText}${p.category ? ` en ${p.category.name}` : ""}. ${p.shortDescription ?? (settings.whatsappOnly ? "Pídelo por WhatsApp." : "Compra en línea o sepáralo por WhatsApp.")} ${settings.storeName}: ${settings.slogan.toLowerCase()}.`.slice(0, 300);
  return {
    title: p.seoTitle || `${p.name} – ${priceText}`,
    description,
    keywords: [p.name, p.category?.name, settings.storeName, "comprar en línea", "precio"].filter(Boolean) as string[],
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      type: "website",
      title: p.seoTitle || p.name,
      description,
      url: `/producto/${p.slug}`,
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt || p.name }] : undefined,
    },
    // Etiquetas de producto para Facebook/Instagram (catálogos y anuncios).
    other: {
      "product:price:amount": (minPrice / 100).toFixed(2),
      "product:price:currency": settings.currency,
      "product:availability": p.variants.some((v) => !v.trackStock || v.stock > 0) ? "in stock" : "out of stock",
      "product:condition": "new",
      "product:retailer_item_id": p.id,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product || product.variants.length === 0) notFound();

  const money = { currency: settings.currency, locale: settings.locale };
  const related = await getRelatedProducts(product.id, product.categoryId);

  const variants: PurchaseVariant[] = product.variants.map((v) => {
    const price = effectivePrice(product, v);
    return {
      id: v.id,
      name: v.name,
      options: (v.options ?? {}) as Record<string, string>,
      priceCents: price.priceCents,
      compareAtCents: price.compareAtCents,
      stock: v.stock,
      trackStock: v.trackStock,
    };
  });
  const options = product.options.map((o) => ({ name: o.name, values: o.values }));
  const cat = product.category;

  const crumbs = [
    { name: "Inicio", path: "/" },
    { name: "Tienda", path: "/tienda" },
    ...(cat?.parent ? [{ name: cat.parent.name, path: `/tienda/${cat.parent.slug}` }] : []),
    ...(cat ? [{ name: cat.name, path: `/tienda/${cat.slug}` }] : []),
    { name: product.name, path: `/producto/${product.slug}` },
  ];

  const minPrice = Math.min(...variants.map((v) => v.priceCents));

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: product.name,
          slug: product.slug,
          description: product.shortDescription || product.description,
          images: product.images.map((i) => i.url),
          sku: product.variants.length === 1 ? product.variants[0].sku : null,
          category: cat?.name ?? null,
          brand: settings.storeName,
          currency: settings.currency,
          variants: variants.map((v, i) => ({ priceCents: v.priceCents, available: !v.trackStock || v.stock > 0, sku: product.variants[i].sku, name: v.name })),
        })}
      />
      <TrackOnMount
        event="view_item"
        params={{
          currency: settings.currency,
          value: minPrice / 100,
          items: [{ item_id: product.id, item_name: product.name, item_category: cat?.name, price: minPrice / 100 }],
        }}
      />

      <Container className="py-8">
        <Breadcrumbs items={crumbs} />
        <div className="mt-4 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            {cat && (
              <Link href={`/tienda/${cat.slug}`} className="text-xs font-bold uppercase tracking-[0.2em] text-acma hover:text-white">
                {cat.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
            {product.shortDescription && <p className="mt-3 text-lg text-silver">{product.shortDescription}</p>}

            <div className="mt-6 border-t border-line pt-6">
              <ProductPurchase product={{ id: product.id, name: product.name, slug: product.slug, category: cat?.name ?? null }} options={options} variants={variants} />
            </div>

            {settings.whatsappOnly ? (
              <p className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-carbon p-4 text-sm text-silver">
                <Truck className="size-5 shrink-0 text-acma" />
                Disponibilidad, envío y forma de pago se confirman por WhatsApp.
              </p>
            ) : (
            <ul className="mt-8 grid gap-3 rounded-xl border border-line bg-carbon p-5 text-sm text-silver">
              <li className="flex items-center gap-3">
                <Truck className="size-5 shrink-0 text-acma" />
                <span>
                  Costo y tiempo de envío calculados en el checkout. <Link href="/politica-de-envios" className="text-white underline decoration-acma">Política de envíos</Link>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="size-5 shrink-0 text-acma" />
                Pago seguro: no almacenamos los datos de tu tarjeta.
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw className="size-5 shrink-0 text-acma" />
                <Link href="/politica-de-devoluciones" className="hover:text-white">
                  Consulta nuestra política de devoluciones
                </Link>
              </li>
            </ul>
            )}
          </div>
        </div>

        {product.description && (
          <section aria-labelledby="descripcion" className="mt-16 max-w-3xl">
            <h2 id="descripcion" className="mb-4 font-display text-2xl font-bold uppercase">
              Descripción
            </h2>
            <RichText content={product.description} />
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeading eyebrow="También te puede gustar" title="Productos relacionados" />
            <ProductGrid products={related} money={money} />
          </section>
        )}
        {/* Espacio para la barra fija de compra en celular */}
        <div className="h-20 lg:hidden" aria-hidden />
      </Container>
    </>
  );
}
