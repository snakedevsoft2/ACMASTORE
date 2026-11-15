import { PackageOpen } from "lucide-react";
import { CatalogTabs } from "@/components/store/catalog-tabs";
import { SocialFollow, WhatsAppBand } from "@/components/store/engagement";
import { Hero } from "@/components/store/hero";
import { Benefits, ProductSection, Testimonials } from "@/components/store/home-sections";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/misc";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { getCatalogForTabs, getCategoryShowcase, getHomeSections } from "@/lib/catalog";
import { db } from "@/lib/db";
import { JsonLd, organizationJsonLd } from "@/lib/seo";
import { getSettings, toPublicSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export default async function HomePage() {
  const [settings, sections, categories, catalog, testimonials, user] = await Promise.all([
    getSettings(),
    getHomeSections(),
    getCategoryShowcase(),
    getCatalogForTabs(),
    db.testimonial.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 6 }),
    getCurrentUser(),
  ]);
  const money = { currency: settings.currency, locale: settings.locale };
  const pub = toPublicSettings(settings);

  // Lista de productos para buscadores (ItemList).
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catálogo ${settings.storeName}`,
    itemListElement: catalog.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/producto/${p.slug}`), name: p.name })),
  };

  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
      {catalog.length > 0 && <JsonLd data={itemList} />}
      {catalog.length === 0 ? (
        <>
        <Hero slogan={settings.slogan} hasOffers={sections.offers.length > 0} />
        <Container className="py-16">
          <EmptyState
            icon={<PackageOpen />}
            title="Muy pronto, nuevos productos"
            description="Estamos preparando nuestro catálogo. Vuelve pronto para descubrir todo lo que tenemos para ti."
            action={can(user?.role, "products:manage") ? <ButtonLink href="/admin/productos/nuevo">Registrar el primer producto</ButtonLink> : undefined}
          />
        </Container>
        </>
      ) : (
        <>
          {/* Lo primero que ve el cliente: los productos, listos para comprar. */}
          <section id="catalogo" aria-labelledby="catalogo-title" className="pb-12 pt-5 sm:pt-8">
            <Container>
              <div className="mb-4 flex items-end justify-between gap-3">
                <h1 id="catalogo-title" className="font-display text-2xl font-extrabold uppercase italic leading-none sm:text-4xl">
                  Nuestros <span className="text-acma">productos</span>
                </h1>
                <p className="hidden text-sm text-silver sm:block">
                  {settings.whatsappOnly ? "Elige tus productos y pídelos por WhatsApp" : "Compra en línea o sepáralos por WhatsApp"}
                </p>
              </div>
              <CatalogTabs categories={categories.map(({ slug, name, count }) => ({ slug, name, count }))} products={catalog} money={money} />
            </Container>
          </section>

          <Hero slogan={settings.slogan} hasOffers={sections.offers.length > 0} headingAs="h2" />

          <ProductSection id="destacados" eyebrow="Selección ACMA" title="Productos destacados" products={sections.featured} money={money} href="/tienda" />

          <ProductSection
            id="ofertas"
            eyebrow="Ahorra hoy"
            title="Ofertas especiales"
            description="Productos con precio rebajado."
            products={sections.offers}
            money={money}
            href="/tienda?ofertas=1"
          />
          {!settings.whatsappOnly && (
            <>
              <WhatsAppBand whatsapp={settings.whatsapp} />
              <ProductSection id="mas-vendidos" eyebrow="Favoritos" title="Más vendidos" products={sections.bestSellers} money={money} href="/tienda?orden=popular" />
            </>
          )}
        </>
      )}

      {!settings.whatsappOnly && <Benefits />}
      <SocialFollow settings={pub} />
      <Testimonials items={testimonials} />
    </>
  );
}
