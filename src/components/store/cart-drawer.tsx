"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { CartIcon } from "@/components/brand/brand-icons";
import type { CartView } from "@/lib/cart";
import { buttonClass } from "@/components/ui/button";
import { CartLineControls } from "./cart-line-controls";
import { WhatsAppGlyph, WhatsAppLink } from "./whatsapp";
import { cartMessage } from "@/lib/whatsapp";
import { useMoney, useStore } from "./store-provider";
import { cn } from "@/lib/utils";

export function CartDrawer({ cart }: { cart: CartView }) {
  const { cartOpen, closeCart, whatsappOnly, whatsapp } = useStore();
  const fmt = useMoney();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cartOpen, closeCart]);

  return (
    <div className={cn("fixed inset-0 z-[60]", !cartOpen && "pointer-events-none")} aria-hidden={!cartOpen}>
      <div
        className={cn("absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300", cartOpen ? "opacity-100" : "opacity-0")}
        onClick={closeCart}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-ink shadow-2xl transition-transform duration-300",
          cartOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-bold uppercase">
            Tu carrito <span className="text-silver">({cart.count})</span>
          </h2>
          <button onClick={closeCart} className="rounded-lg p-2 text-silver hover:bg-white/5 hover:text-white" aria-label="Cerrar carrito">
            <X className="size-5" />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <CartIcon className="size-16 text-acma" />
            <p className="text-silver">Tu carrito está vacío.</p>
            <Link href="/tienda" onClick={closeCart} className={buttonClass("primary")}>
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex gap-4 py-4">
                  <Link
                    href={`/producto/${line.productSlug}`}
                    onClick={closeCart}
                    className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-white"
                  >
                    {line.imageUrl && <Image src={line.imageUrl} alt={line.productName} fill sizes="80px" className="object-contain p-0.5" />}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Link href={`/producto/${line.productSlug}`} onClick={closeCart} className="line-clamp-2 text-sm font-medium hover:text-acma">
                      {line.productName}
                    </Link>
                    {line.variantName && <p className="text-xs text-silver">{line.variantName}</p>}
                    <p className="text-sm font-semibold">{fmt(line.lineTotalCents)}</p>
                    {line.issue && <p className="text-xs font-medium text-acma">{line.issue}</p>}
                    <CartLineControls line={line} compact />
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-line bg-carbon/50 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-silver">Subtotal</span>
                <span className="font-semibold">{fmt(cart.subtotalCents)}</span>
              </div>
              {whatsappOnly ? (
                <>
                  <p className="text-xs text-silver-dim">Confirmamos disponibilidad, envío y forma de pago por WhatsApp.</p>
                  {cart.hasIssues ? (
                    <Link href="/carrito" onClick={closeCart} className={buttonClass("secondary", "lg", "w-full")}>
                      Revisar carrito
                    </Link>
                  ) : whatsapp ? (
                    <WhatsAppLink
                      intent="comprar"
                      message={cartMessage(
                        cart.lines.map((l) => ({ name: l.productName, variant: l.variantName, quantity: l.quantity, total: fmt(l.lineTotalCents) })),
                        fmt(cart.subtotalCents),
                      )}
                      className={buttonClass("primary", "lg", "w-full")}
                    >
                      <WhatsAppGlyph className="size-5" /> Enviar pedido por WhatsApp
                    </WhatsAppLink>
                  ) : (
                    <p className="text-sm text-silver">Muy pronto podrás enviar tu pedido por WhatsApp.</p>
                  )}
                  <Link href="/carrito" onClick={closeCart} className="block text-center text-sm text-silver hover:text-white">
                    Ver carrito
                  </Link>
                </>
              ) : (
              <>
              <p className="text-xs text-silver-dim">Envío y descuentos se calculan en el checkout.</p>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/carrito" onClick={closeCart} className={buttonClass("secondary")}>
                  Ver carrito
                </Link>
                <Link
                  href={cart.hasIssues ? "/carrito" : "/checkout"}
                  onClick={closeCart}
                  className={buttonClass("primary")}
                >
                  Pagar
                </Link>
              </div>
              <WhatsAppLink
                intent="asesoria"
                message={cartMessage(
                  cart.lines.map((l) => ({ name: l.productName, variant: l.variantName, quantity: l.quantity, total: fmt(l.lineTotalCents) })),
                  fmt(cart.subtotalCents),
                )}
                className="flex items-center justify-center gap-2 text-sm text-silver hover:text-white"
              >
                <WhatsAppGlyph className="size-4 text-acma" /> O envía tu pedido por WhatsApp
              </WhatsAppLink>
              </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
