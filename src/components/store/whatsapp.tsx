"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { WhatsApp3D } from "@/components/brand/brand-icons";
import { track } from "@/components/analytics";
import { cn } from "@/lib/utils";
import { GENERAL_MESSAGE, productMessage, whatsappLink, type WhatsAppIntent } from "@/lib/whatsapp";
import { useStore } from "./store-provider";

export function WhatsAppGlyph({ className = "size-5" }: { className?: string }) {
  return <WhatsApp3D className={className} />;
}

type ProductRef = { name: string; path: string; variant?: string | null; price?: string | null; quantity?: number };

/**
 * Enlace a WhatsApp con mensaje prellenado. El enlace absoluto del producto se agrega al hacer
 * clic (con el dominio real de la página), y el clic se mide como contacto en GA4 y Meta.
 * No se muestra si la tienda no configuró su número.
 */
export function WhatsAppLink({
  intent = "asesoria",
  product,
  message,
  className,
  children,
  ariaLabel,
}: {
  intent?: WhatsAppIntent;
  product?: ProductRef;
  message?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const { whatsapp } = useStore();
  if (!whatsapp) return null;

  const build = (origin?: string) =>
    whatsappLink(
      whatsapp,
      product
        ? productMessage({
            intent,
            name: product.name,
            variant: product.variant,
            price: product.price,
            quantity: product.quantity,
            url: origin ? `${origin}${product.path}` : null,
          })
        : (message ?? GENERAL_MESSAGE),
    );

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.href = build(window.location.origin);
    track("generate_lead", { method: `whatsapp_${intent}`, content_name: product?.name ?? "general" });
  };

  return (
    <a href={build()} onClick={onClick} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} className={className}>
      {children}
    </a>
  );
}

/** Botón flotante de asesoría, visible en toda la tienda. */
export function FloatingWhatsApp() {
  const { whatsapp } = useStore();
  const pathname = usePathname();
  if (!whatsapp || pathname.startsWith("/checkout")) return null;
  // En la ficha de producto, en celular, la barra inferior ya incluye WhatsApp.
  const onProduct = pathname.startsWith("/producto/");
  return (
    <div className={cn("fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6", onProduct && "hidden lg:block")}>
      <WhatsAppLink
        intent="asesoria"
        ariaLabel="Escríbenos por WhatsApp para recibir asesoría"
        className="group flex items-center gap-3 rounded-full border border-line-strong bg-carbon/95 p-1.5 text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.8)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-acma sm:pr-5"
      >
        <span className="relative grid size-14 place-items-center">
          <span className="absolute inset-1 animate-ping rounded-full bg-[#25C257]/40 [animation-duration:2.5s]" aria-hidden />
          <WhatsAppGlyph className="relative size-14 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" />
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[11px] uppercase tracking-wider text-white/80">¿Necesitas ayuda?</span>
          <span className="block text-sm font-bold">Asesoría por WhatsApp</span>
        </span>
      </WhatsAppLink>
    </div>
  );
}
