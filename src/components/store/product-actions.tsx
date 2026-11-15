"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Loader2, Zap } from "lucide-react";
import { CartIcon } from "@/components/brand/brand-icons";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { track } from "@/components/analytics";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMoney, useStore } from "./store-provider";
import { WhatsAppGlyph, WhatsAppLink } from "./whatsapp";

export type TrackedItem = { id: string; name: string; variant?: string | null; category?: string | null; priceCents: number };

function gaItem(item: TrackedItem, quantity: number) {
  return {
    item_id: item.id,
    item_name: item.name,
    item_variant: item.variant ?? undefined,
    item_category: item.category ?? undefined,
    price: item.priceCents / 100,
    quantity,
  };
}

export function useCartActions() {
  const { openCart, toast, money } = useStore();
  const [pending, start] = useTransition();

  const add = (variantId: string, quantity: number, item: TrackedItem) =>
    start(async () => {
      const res = await addToCartAction(variantId, quantity);
      if (!res.ok) {
        toast(res.error ?? "No se pudo agregar.", "error");
        return;
      }
      track("add_to_cart", { currency: money.currency, value: (item.priceCents * quantity) / 100, items: [gaItem(item, quantity)] });
      openCart();
    });

  const buyNow = (variantId: string, quantity: number, item: TrackedItem) =>
    start(async () => {
      track("add_to_cart", { currency: money.currency, value: (item.priceCents * quantity) / 100, items: [gaItem(item, quantity)] });
      const res = await buyNowAction(variantId, quantity);
      if (res && !res.ok) toast(res.error ?? "No se pudo continuar.", "error");
    });

  return { add, buyNow, pending };
}

export type CardProduct = {
  id: string;
  name: string;
  slug: string;
  categoryName: string | null;
  priceCents: number;
  available: boolean;
  quickAddVariantId: string | null;
};

const small = "h-9 px-2 text-xs sm:text-sm";

/** Acciones de la tarjeta de producto: comprar, carrito y separar por WhatsApp. */
export function CardActions({ product: p }: { product: CardProduct }) {
  const { add, buyNow, pending } = useCartActions();
  const { whatsapp, whatsappOnly } = useStore();
  const fmt = useMoney();
  const href = `/producto/${p.slug}`;
  const item = { id: p.id, name: p.name, category: p.categoryName, priceCents: p.priceCents };
  const waProduct = { name: p.name, path: href, price: fmt(p.priceCents) };

  const waButton = (intent: "separar" | "consultar", label: string) => (
    <WhatsAppLink intent={intent} product={waProduct} ariaLabel={`${label} ${p.name} por WhatsApp`} className={buttonClass("secondary", "sm", cn(small, "w-full"))}>
      <WhatsAppGlyph className="size-4 text-acma" />
      {label}
    </WhatsAppLink>
  );

  if (whatsappOnly) {
    return (
      <div className={cn("grid gap-2", pending && "pointer-events-none opacity-70")}>
        {p.available ? (
          <WhatsAppLink intent="comprar" product={waProduct} ariaLabel={`Comprar ${p.name} por WhatsApp`} className={buttonClass("primary", "sm", cn(small, "w-full"))}>
            <WhatsAppGlyph className="size-5" /> Comprar
          </WhatsAppLink>
        ) : (
          whatsapp && waButton("consultar", "Consultar")
        )}
        {p.available && p.quickAddVariantId ? (
          <button
            type="button"
            onClick={() => add(p.quickAddVariantId!, 1, item)}
            className={buttonClass("secondary", "sm", cn(small, "w-full"))}
            aria-label={`Agregar ${p.name} al carrito`}
          >
            <CartIcon className="size-5" /> Agregar al carrito
          </button>
        ) : (
          <Link href={href} className={buttonClass("secondary", "sm", cn(small, "w-full"))}>
            {p.available ? "Elegir opciones" : "Ver producto"}
          </Link>
        )}
      </div>
    );
  }

  if (!p.available) {
    return (
      <div className="grid gap-2">
        <Link href={href} className={buttonClass("secondary", "sm", cn(small, "w-full"))}>
          Ver producto
        </Link>
        {whatsapp && waButton("consultar", "Consultar")}
      </div>
    );
  }

  if (!p.quickAddVariantId) {
    return (
      <div className="grid gap-2">
        <Link href={href} className={buttonClass("primary", "sm", cn(small, "w-full"))}>
          Elegir opciones
        </Link>
        {whatsapp && waButton("separar", "Separar")}
      </div>
    );
  }

  const variantId = p.quickAddVariantId;
  return (
    <div className={cn("grid gap-2", pending && "pointer-events-none opacity-70")}>
      <button type="button" onClick={() => buyNow(variantId, 1, item)} className={buttonClass("primary", "sm", cn(small, "w-full"))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
        Comprar
      </button>
      <div className={cn("grid gap-2", whatsapp ? "grid-cols-[2.25rem_1fr] min-[400px]:grid-cols-2" : "grid-cols-1")}>
        <button
          type="button"
          onClick={() => add(variantId, 1, item)}
          className={buttonClass("secondary", "sm", cn(small, "w-full px-0 min-[400px]:px-2"))}
          aria-label={`Agregar ${p.name} al carrito`}
        >
          <CartIcon className="size-5" />
          <span className={cn(whatsapp && "hidden min-[400px]:inline")}>{whatsapp ? "Carrito" : "Agregar al carrito"}</span>
        </button>
        {whatsapp && waButton("separar", "Separar")}
      </div>
    </div>
  );
}
