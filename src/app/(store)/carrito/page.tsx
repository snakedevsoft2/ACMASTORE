import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { CartIcon } from "@/components/brand/brand-icons";
import { fixCartAction } from "@/app/actions/checkout";
import { CartLineControls } from "@/components/store/cart-line-controls";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/misc";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { cartMessage } from "@/lib/whatsapp";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/store/whatsapp";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default async function CarritoPage() {
  const [cart, settings] = await Promise.all([getCart(), getSettings()]);
  const money = { currency: settings.currency, locale: settings.locale };
  const fmt = (c: number) => formatMoney(c, money);

  return (
    <Container className="py-10">
      <h1 className="mb-8 font-display text-4xl font-extrabold uppercase italic sm:text-5xl">
        Tu <span className="text-acma">carrito</span>
      </h1>

      {cart.lines.length === 0 ? (
        <EmptyState
          icon={<CartIcon />}
          title="Tu carrito está vacío"
          description="Explora la tienda y agrega los productos que te gusten."
          action={<ButtonLink href="/tienda">Ir a la tienda</ButtonLink>}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-label="Productos en el carrito">
            {cart.hasIssues && (
              <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-acma/40 bg-acma/10 p-4 text-sm">
                <p className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-acma" />
                  La disponibilidad de algunos productos cambió.
                </p>
                <form action={fixCartAction}>
                  <Button size="sm">Ajustar carrito</Button>
                </form>
              </div>
            )}
            <ul className="divide-y divide-line rounded-xl border border-line bg-carbon">
              {cart.lines.map((line) => (
                <li key={line.itemId} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                  <Link href={`/producto/${line.productSlug}`} className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-white sm:size-28">
                    {line.imageUrl && <Image src={line.imageUrl} alt={line.productName} fill sizes="112px" className="object-contain p-1" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                    <div className="space-y-1">
                      <Link href={`/producto/${line.productSlug}`} className="font-medium hover:text-acma">
                        {line.productName}
                      </Link>
                      {line.variantName && <p className="text-sm text-silver">{line.variantName}</p>}
                      <p className="text-sm text-silver">
                        {fmt(line.unitPriceCents)}
                        {line.compareAtCents && <span className="ml-2 text-silver-dim line-through">{fmt(line.compareAtCents)}</span>}
                      </p>
                      {line.issue && <p className="text-sm font-medium text-acma">{line.issue}</p>}
                      <div className="pt-1">
                        <CartLineControls line={line} />
                      </div>
                    </div>
                    <p className="font-semibold sm:text-right">{fmt(line.lineTotalCents)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/tienda" className="mt-5 inline-block text-sm text-silver hover:text-white">
              ← Seguir comprando
            </Link>
          </section>

          <aside className="h-fit rounded-xl border border-line bg-carbon p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold uppercase">Resumen</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-silver">Subtotal ({cart.count} {cart.count === 1 ? "producto" : "productos"})</dt>
                <dd className="font-semibold">{fmt(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-silver">Envío</dt>
                <dd className="text-silver">{settings.whatsappOnly ? "Se coordina por WhatsApp" : "Se calcula en el checkout"}</dd>
              </div>
              {!settings.whatsappOnly && (
                <div className="flex justify-between">
                  <dt className="text-silver">Cupón de descuento</dt>
                  <dd className="text-silver">En el checkout</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex justify-between border-t border-line pt-5 text-lg font-bold">
              <span>Subtotal</span>
              <span>{fmt(cart.subtotalCents)}</span>
            </div>
            {cart.hasIssues ? (
              <Button className="mt-6 w-full" size="lg" disabled>
                Ajusta el carrito para continuar
              </Button>
            ) : settings.whatsappOnly ? (
              <WhatsAppLink
                intent="comprar"
                message={cartMessage(
                  cart.lines.map((l) => ({ name: l.productName, variant: l.variantName, quantity: l.quantity, total: fmt(l.lineTotalCents) })),
                  fmt(cart.subtotalCents),
                )}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-acma text-base font-bold text-white transition-colors hover:bg-acma-dark"
              >
                <WhatsAppGlyph className="size-6" /> Enviar pedido por WhatsApp
              </WhatsAppLink>
            ) : (
              <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
                Continuar con la compra
              </ButtonLink>
            )}
            {settings.whatsappOnly && !settings.whatsapp && !cart.hasIssues && (
              <p className="mt-4 text-sm text-silver">Muy pronto podrás enviar tu pedido por WhatsApp.</p>
            )}
            {!settings.whatsappOnly && (
            <WhatsAppLink
              intent="asesoria"
              message={cartMessage(
                cart.lines.map((l) => ({ name: l.productName, variant: l.variantName, quantity: l.quantity, total: fmt(l.lineTotalCents) })),
                fmt(cart.subtotalCents),
              )}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line-strong font-semibold text-white transition-colors hover:border-acma"
            >
              <WhatsAppGlyph className="size-5 text-acma" /> Enviar pedido por WhatsApp
            </WhatsAppLink>
            )}
          </aside>
        </div>
      )}
    </Container>
  );
}
