"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __acmaCurrency?: string;
  }
}

type Item = { item_id?: string; item_name?: string; price?: number; quantity?: number };

/** Equivalencias de eventos GA4 → Meta Pixel (estándar de Facebook/Instagram Ads). */
function toMeta(event: string, p: Record<string, unknown>): [string, Record<string, unknown>] | null {
  const items = (p.items as Item[] | undefined) ?? [];
  const currency = (p.currency as string | undefined) ?? window.__acmaCurrency;
  const base = {
    content_ids: items.map((i) => i.item_id).filter(Boolean),
    content_type: "product",
    contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, item_price: i.price })),
    value: p.value,
    currency,
  };
  switch (event) {
    case "view_item":
      return ["ViewContent", { ...base, content_name: items[0]?.item_name }];
    case "add_to_cart":
      return ["AddToCart", base];
    case "begin_checkout":
      return ["InitiateCheckout", { ...base, num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0) }];
    case "add_payment_info":
      return ["AddPaymentInfo", base];
    case "purchase":
      return ["Purchase", { ...base, num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0) }];
    case "generate_lead":
      return ["Contact", { content_name: p.content_name, content_category: p.method }];
    case "search":
      return ["Search", { search_string: p.search_term }];
    default:
      return null;
  }
}

/**
 * Envía un evento a GA4 / Google Ads y, si corresponde, a Meta Pixel.
 * No hace nada si la analítica no está configurada.
 */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
  if (window.fbq) {
    const meta = toMeta(event, params);
    if (meta) window.fbq("track", meta[0], meta[1]);
  }
}

/**
 * Carga Google Analytics 4, Google Ads y Meta Pixel cuando hay IDs configurados en el admin.
 * Consentimiento: medición y publicidad quedan desactivadas hasta que el visitante acepte.
 */
export function Analytics({
  gaId,
  adsId,
  metaPixelId,
  currency,
}: {
  gaId: string | null;
  adsId: string | null;
  metaPixelId: string | null;
  currency: string;
}) {
  const googleId = gaId || adsId;
  const googleIds = [gaId, adsId].filter(Boolean) as string[];
  return (
    <>
      <Script id="acma-currency" strategy="afterInteractive">{`window.__acmaCurrency = ${JSON.stringify(currency)};`}</Script>
      {googleId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var c = null; try { c = localStorage.getItem('acma_consent'); } catch (e) {}
var g = c === 'granted' ? 'granted' : 'denied';
gtag('consent', 'default', { ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g });
gtag('js', new Date());
${googleIds.map((id) => `gtag('config', ${JSON.stringify(id)});`).join("\n")}`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
var c = null; try { c = localStorage.getItem('acma_consent'); } catch (e) {}
fbq('consent', c === 'granted' ? 'grant' : 'revoke');
fbq('init', ${JSON.stringify(metaPixelId)});
fbq('track', 'PageView');`}
          </Script>
          <MetaPageViews />
        </>
      )}
    </>
  );
}

/** En navegación interna (sin recarga) Meta no detecta el cambio de página: se envía aquí. */
function MetaPageViews() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);
  return null;
}

/** Dispara un evento una sola vez al montar (ej. view_item en la ficha de producto). */
export function TrackOnMount({ event, params, onceKey }: { event: string; params: Record<string, unknown>; onceKey?: string }) {
  useEffect(() => {
    if (onceKey) {
      try {
        if (sessionStorage.getItem(onceKey)) return;
        sessionStorage.setItem(onceKey, "1");
      } catch {
        /* almacenamiento no disponible: se envía igualmente */
      }
    }
    // Espera a que los scripts de medición terminen de cargar.
    const t = setTimeout(() => track(event, params), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
