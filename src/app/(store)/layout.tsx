import { Analytics } from "@/components/analytics";
import { ConsentBanner } from "@/components/store/consent-banner";
import { FloatingWhatsApp } from "@/components/store/whatsapp";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { StoreProvider } from "@/components/store/store-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { getNavCategories } from "@/lib/catalog";
import { getSettings, toPublicSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, user, cart] = await Promise.all([getSettings(), getNavCategories(), getCurrentUser(), getCart()]);
  const pub = toPublicSettings(settings);
  const hasAnalytics = Boolean(settings.gaMeasurementId || settings.googleAdsId || settings.metaPixelId);

  return (
    <StoreProvider money={{ currency: settings.currency, locale: settings.locale }} storeName={settings.storeName} whatsapp={settings.whatsapp}>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-acma focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <Header settings={pub} categories={categories} userName={user?.name ?? null} cart={cart} />
      <main id="contenido" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={pub} />
      <Analytics gaId={settings.gaMeasurementId} adsId={settings.googleAdsId} metaPixelId={settings.metaPixelId} currency={settings.currency} />
      <FloatingWhatsApp />
      {hasAnalytics && <ConsentBanner />}
    </StoreProvider>
  );
}
