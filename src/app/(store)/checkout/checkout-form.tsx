"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CreditCard, Landmark, Lock, Tag, Truck, Wallet, X } from "lucide-react";
import { placeOrderAction, previewCouponAction, type CouponPreview } from "@/app/actions/checkout";
import { track } from "@/components/analytics";
import { useMoney } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import type { CartView } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

export type CheckoutShipping = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  freeOverCents: number | null;
  estimatedDays: string | null;
};
export type CheckoutPayment = { provider: string; displayName: string; description: string | null; isOnline: boolean };
export type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  notes: string | null;
  isDefault: boolean;
};

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  STRIPE: CreditCard,
  MERCADOPAGO: Wallet,
  BANK_TRANSFER: Landmark,
  CASH_ON_DELIVERY: Truck,
};

type AddressFields = Omit<SavedAddress, "id" | "label" | "isDefault" | "line2" | "postalCode" | "notes"> & {
  line2: string;
  postalCode: string;
  notes: string;
};

function fromSaved(a: SavedAddress): AddressFields {
  return { fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode ?? "", country: a.country, notes: a.notes ?? "" };
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-carbon p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 font-display text-xl font-bold uppercase">
        <span className="grid size-8 place-items-center rounded-full bg-acma text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutForm({
  cart,
  shippingMethods,
  paymentMethods,
  user,
  addresses,
  defaultCountry,
}: {
  cart: CartView;
  shippingMethods: CheckoutShipping[];
  paymentMethods: CheckoutPayment[];
  user: { name: string; email: string; phone: string | null } | null;
  addresses: SavedAddress[];
  defaultCountry: string;
}) {
  const fmt = useMoney();
  const [state, onSubmit, pending] = useFormAction(placeOrderAction, {});
  const err = state.fieldErrors ?? {};

  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddr?.id ?? "new");
  const [contact, setContact] = useState({ email: user?.email ?? "", customerName: user?.name ?? "", customerPhone: user?.phone ?? "" });
  const [addr, setAddr] = useState<AddressFields>(
    defaultAddr
      ? fromSaved(defaultAddr)
      : { fullName: user?.name ?? "", phone: user?.phone ?? "", line1: "", line2: "", city: "", state: "", postalCode: "", country: defaultCountry, notes: "" },
  );
  const [shippingId, setShippingId] = useState(shippingMethods[0]?.id ?? "");
  const [provider, setProvider] = useState(paymentMethods[0]?.provider ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Extract<CouponPreview, { ok: true }> | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, startCoupon] = useTransition();

  const shipping = shippingMethods.find((s) => s.id === shippingId) ?? null;
  const totals = useMemo(
    () =>
      computeTotals({
        lines: cart.lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
        coupon,
        shipping,
      }),
    [cart.lines, coupon, shipping],
  );

  const gaItems = cart.lines.map((l) => ({ item_id: l.productId, item_name: l.productName, item_variant: l.variantName ?? undefined, price: l.unitPriceCents / 100, quantity: l.quantity }));
  useEffect(() => {
    track("begin_checkout", { value: cart.subtotalCents / 100, items: gaItems });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickAddress = (id: string) => {
    setAddressId(id);
    const a = addresses.find((x) => x.id === id);
    if (a) setAddr(fromSaved(a));
    else setAddr({ fullName: contact.customerName, phone: contact.customerPhone, line1: "", line2: "", city: "", state: "", postalCode: "", country: defaultCountry, notes: "" });
  };

  const applyCoupon = () =>
    startCoupon(async () => {
      setCouponError(null);
      const res = await previewCouponAction(couponInput);
      if (res.ok) {
        setCoupon(res);
        setCouponInput("");
      } else setCouponError(res.error);
    });

  const ready = shippingMethods.length > 0 && paymentMethods.length > 0;
  const selectedPayment = paymentMethods.find((p) => p.provider === provider);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        {!ready && (
          <div role="alert" className="rounded-xl border border-acma/40 bg-acma/10 p-4 text-sm">
            La tienda todavía no tiene {shippingMethods.length === 0 ? "métodos de envío" : "métodos de pago"} habilitados, por lo que no es posible
            completar compras en este momento. Por favor contáctanos.
          </div>
        )}
        <FormMessage state={state} />

        <Step n={1} title="Tus datos">
          {!user && (
            <p className="mb-5 rounded-lg border border-line bg-ink-soft px-4 py-3 text-sm text-silver">
              Estás comprando como invitado.{" "}
              <Link href="/cuenta/ingresar?next=/checkout" className="font-semibold text-white underline decoration-acma">
                Ingresa
              </Link>{" "}
              para guardar tus direcciones y ver tu historial.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo electrónico" name="email" error={err.email} required className="sm:col-span-2">
              <Input name="email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={err.email} />
            </Field>
            <Field label="Nombre completo" name="customerName" error={err.customerName} required>
              <Input name="customerName" autoComplete="name" value={contact.customerName} onChange={(e) => setContact({ ...contact, customerName: e.target.value })} error={err.customerName} />
            </Field>
            <Field label="Teléfono" name="customerPhone" error={err.customerPhone} required>
              <Input name="customerPhone" type="tel" autoComplete="tel" value={contact.customerPhone} onChange={(e) => setContact({ ...contact, customerPhone: e.target.value })} error={err.customerPhone} />
            </Field>
          </div>
        </Step>

        <Step n={2} title="Dirección de entrega">
          {addresses.length > 0 && (
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {addresses.map((a) => (
                <label key={a.id} className={cn("cursor-pointer rounded-lg border p-3 text-sm transition-colors", addressId === a.id ? "border-acma bg-acma/10" : "border-line hover:border-line-strong")}>
                  <input type="radio" name="savedAddress" className="sr-only" checked={addressId === a.id} onChange={() => pickAddress(a.id)} />
                  <span className="font-semibold text-white">{a.label || a.fullName}</span>
                  <span className="mt-1 block text-silver">
                    {a.line1}, {a.city}
                  </span>
                </label>
              ))}
              <label className={cn("cursor-pointer rounded-lg border p-3 text-sm transition-colors", addressId === "new" ? "border-acma bg-acma/10" : "border-line hover:border-line-strong")}>
                <input type="radio" name="savedAddress" className="sr-only" checked={addressId === "new"} onChange={() => pickAddress("new")} />
                <span className="font-semibold text-white">+ Nueva dirección</span>
              </label>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de quien recibe" name="fullName" error={err.fullName} required>
              <Input name="fullName" autoComplete="shipping name" value={addr.fullName} onChange={(e) => setAddr({ ...addr, fullName: e.target.value })} error={err.fullName} />
            </Field>
            <Field label="Teléfono de contacto" name="phone" error={err.phone} required>
              <Input name="phone" type="tel" autoComplete="shipping tel" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} error={err.phone} />
            </Field>
            <Field label="Dirección" name="line1" error={err.line1} required className="sm:col-span-2">
              <Input name="line1" autoComplete="shipping address-line1" placeholder="Calle, número" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} error={err.line1} />
            </Field>
            <Field label="Complemento" name="line2" error={err.line2} className="sm:col-span-2">
              <Input name="line2" autoComplete="shipping address-line2" placeholder="Apartamento, torre, barrio (opcional)" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} />
            </Field>
            <Field label="Ciudad" name="city" error={err.city} required>
              <Input name="city" autoComplete="shipping address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} error={err.city} />
            </Field>
            <Field label="Departamento / Estado" name="state" error={err.state} required>
              <Input name="state" autoComplete="shipping address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} error={err.state} />
            </Field>
            <Field label="Código postal" name="postalCode" error={err.postalCode}>
              <Input name="postalCode" autoComplete="shipping postal-code" value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} />
            </Field>
            <Field label="País" name="country" error={err.country} required>
              <Input name="country" autoComplete="shipping country-name" value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })} error={err.country} />
            </Field>
            <Field label="Indicaciones para la entrega" name="notes" error={err.notes} className="sm:col-span-2">
              <Textarea name="notes" rows={2} placeholder="Ej.: dejar en portería (opcional)" value={addr.notes} onChange={(e) => setAddr({ ...addr, notes: e.target.value })} />
            </Field>
          </div>
          {user && addressId === "new" && <Checkbox name="saveAddress" defaultChecked label="Guardar esta dirección en mi cuenta" className="mt-4" />}
        </Step>

        <Step n={3} title="Método de envío">
          {err.shippingMethodId && <p className="mb-3 text-sm text-acma">{err.shippingMethodId}</p>}
          <div className="space-y-2">
            {shippingMethods.map((s) => {
              const free = s.freeOverCents != null && totals.subtotalCents - totals.discountCents >= s.freeOverCents;
              return (
                <label key={s.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", shippingId === s.id ? "border-acma bg-acma/10" : "border-line hover:border-line-strong")}>
                  <input
                    type="radio"
                    name="shippingMethodId"
                    value={s.id}
                    checked={shippingId === s.id}
                    onChange={() => {
                      setShippingId(s.id);
                      track("add_shipping_info", { shipping_tier: s.name, value: totals.totalCents / 100, items: gaItems });
                    }}
                    className="mt-1 accent-[#E50914]"
                  />
                  <span className="flex-1">
                    <span className="flex justify-between gap-3 font-semibold">
                      {s.name}
                      <span>{free || s.priceCents === 0 ? "Gratis" : fmt(s.priceCents)}</span>
                    </span>
                    {s.estimatedDays && <span className="block text-sm text-silver">Entrega estimada: {s.estimatedDays}</span>}
                    {s.description && <span className="block text-sm text-silver-dim">{s.description}</span>}
                    {s.freeOverCents != null && !free && <span className="block text-xs text-silver-dim">Gratis en compras desde {fmt(s.freeOverCents)}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </Step>

        <Step n={4} title="Método de pago">
          {err.paymentProvider && <p className="mb-3 text-sm text-acma">{err.paymentProvider}</p>}
          <div className="space-y-2">
            {paymentMethods.map((p) => {
              const Icon = PAYMENT_ICONS[p.provider] ?? CreditCard;
              return (
                <label key={p.provider} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", provider === p.provider ? "border-acma bg-acma/10" : "border-line hover:border-line-strong")}>
                  <input
                    type="radio"
                    name="paymentProvider"
                    value={p.provider}
                    checked={provider === p.provider}
                    onChange={() => {
                      setProvider(p.provider);
                      track("add_payment_info", { payment_type: p.displayName, value: totals.totalCents / 100, items: gaItems });
                    }}
                    className="mt-1 accent-[#E50914]"
                  />
                  <Icon className="mt-0.5 size-5 text-acma" />
                  <span className="flex-1">
                    <span className="block font-semibold">{p.displayName}</span>
                    {p.description && <span className="block text-sm text-silver">{p.description}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedPayment?.isOnline && (
            <p className="mt-4 flex items-center gap-2 text-xs text-silver">
              <Lock className="size-3.5 text-acma" /> Serás redirigido a la pasarela segura para completar el pago. No almacenamos los datos de tu tarjeta.
            </p>
          )}
          <Field label="Nota para la tienda" name="customerNote" error={err.customerNote} className="mt-5">
            <Textarea name="customerNote" rows={2} placeholder="Opcional" maxLength={500} />
          </Field>
        </Step>
      </div>

      <aside className="h-fit space-y-5 rounded-xl border border-line bg-carbon p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold uppercase">Resumen del pedido</h2>
        <ul className="max-h-72 space-y-4 overflow-y-auto pr-1">
          {cart.lines.map((l) => (
            <li key={l.itemId} className="flex gap-3 text-sm">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-white">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-contain p-0.5" />}
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-acma text-[10px] font-bold">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2">{l.productName}</p>
                {l.variantName && <p className="text-xs text-silver">{l.variantName}</p>}
              </div>
              <p className="font-semibold">{fmt(l.lineTotalCents)}</p>
            </li>
          ))}
        </ul>

        <div className="border-t border-line pt-4">
          {coupon ? (
            <div className="flex items-center justify-between rounded-lg border border-acma/40 bg-acma/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Tag className="size-4 text-acma" /> <strong>{coupon.code}</strong>
              </span>
              <button type="button" onClick={() => setCoupon(null)} className="text-silver hover:text-white" aria-label="Quitar cupón">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="coupon-input" className="sr-only">
                Cupón de descuento
              </label>
              <Input
                id="coupon-input"
                name="_coupon"
                placeholder="Cupón de descuento"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={applyCoupon} disabled={!couponInput || checkingCoupon}>
                Aplicar
              </Button>
            </div>
          )}
          {couponError && <p className="mt-2 text-xs text-acma">{couponError}</p>}
          {coupon && totals.couponBelowMinimum && <p className="mt-2 text-xs text-acma">Tu compra no alcanza el mínimo para este cupón.</p>}
          <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />
        </div>

        <dl className="space-y-2.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-silver">Subtotal</dt>
            <dd>{fmt(totals.subtotalCents)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between text-white">
              <dt className="text-silver">Descuento</dt>
              <dd className="font-semibold text-acma">− {fmt(totals.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-silver">Envío</dt>
            <dd>{shipping ? (totals.shippingCents === 0 ? "Gratis" : fmt(totals.shippingCents)) : "—"}</dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-bold">{fmt(totals.totalCents)}</span>
        </div>
        <input type="hidden" name="expectedTotalCents" value={totals.totalCents} />

        <Checkbox
          name="acceptTerms"
          label={
            <>
              Acepto los{" "}
              <Link href="/terminos-y-condiciones" target="_blank" className="text-white underline decoration-acma">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/politica-de-privacidad" target="_blank" className="text-white underline decoration-acma">
                política de privacidad
              </Link>
              .
            </>
          }
        />
        {err.acceptTerms && <p className="text-xs text-acma">{err.acceptTerms}</p>}

        <SubmitButton size="lg" className="w-full" pending={pending} disabled={!ready} pendingText="Procesando…">
          <Lock className="size-4" />
          {selectedPayment?.isOnline ? "Confirmar e ir a pagar" : "Confirmar pedido"}
        </SubmitButton>
      </aside>
    </form>
  );
}
