"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircleQuestion, Minus, Plus, Zap } from "lucide-react";
import { CartIcon } from "@/components/brand/brand-icons";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { discountPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCartActions } from "./product-actions";
import { useMoney } from "./store-provider";
import { WhatsAppGlyph, WhatsAppLink } from "./whatsapp";

export type PurchaseVariant = {
  id: string;
  name: string;
  options: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  trackStock: boolean;
};

const canSell = (v: PurchaseVariant) => !v.trackStock || v.stock > 0;

export function ProductPurchase({
  product,
  options,
  variants,
}: {
  product: { id: string; name: string; slug: string; category: string | null };
  options: Array<{ name: string; values: string[] }>;
  variants: PurchaseVariant[];
}) {
  const fmt = useMoney();
  const { add, buyNow, pending } = useCartActions();
  const initial = variants.find(canSell) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(initial?.options ?? {});
  const [qty, setQty] = useState(1);

  const variant = useMemo(
    () => (options.length === 0 ? variants[0] : variants.find((v) => options.every((o) => v.options[o.name] === selected[o.name]))),
    [options, variants, selected],
  );

  /** Estado de un valor dado el resto de la selección actual. */
  const valueState = (optName: string, value: string): "ok" | "soldout" | "none" => {
    const matches = variants.filter(
      (v) => v.options[optName] === value && options.every((o) => o.name === optName || v.options[o.name] === selected[o.name]),
    );
    if (matches.length === 0) return "none";
    return matches.some(canSell) ? "ok" : "soldout";
  };

  const choose = (optName: string, value: string) => {
    const next = { ...selected, [optName]: value };
    if (!variants.some((v) => options.every((o) => v.options[o.name] === next[o.name]))) {
      const fallback = variants.find((v) => v.options[optName] === value && canSell(v)) ?? variants.find((v) => v.options[optName] === value);
      if (fallback) {
        setSelected(fallback.options);
        setQty(1);
        return;
      }
    }
    setSelected(next);
    setQty(1);
  };

  const price = variant?.priceCents ?? Math.min(...variants.map((v) => v.priceCents));
  const compareAt = variant?.compareAtCents ?? null;
  const pct = discountPercent(price, compareAt);
  const maxQty = !variant ? 1 : variant.trackStock ? Math.min(variant.stock, 99) : 99;
  const canBuy = Boolean(variant) && canSell(variant!);
  const variantLabel = options.length > 0 ? variant?.name : null;
  const tracked = { id: product.id, name: product.name, category: product.category, variant: variantLabel, priceCents: price };
  const waProduct = { name: product.name, path: `/producto/${product.slug}`, variant: variantLabel, price: fmt(price * qty), quantity: qty };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-extrabold tracking-tight text-white">{fmt(price)}</span>
          {compareAt && <span className="text-lg text-silver-dim line-through">{fmt(compareAt)}</span>}
          {pct && <Badge tone="red">-{pct}%</Badge>}
        </div>
        {compareAt && <p className="mt-1 text-sm font-semibold text-acma">Ahorras {fmt(compareAt - price)}</p>}
      </div>

      {options.map((opt) => (
        <fieldset key={opt.name}>
          <legend className="mb-2.5 text-sm text-silver">
            {opt.name}: <span className="font-semibold text-white">{selected[opt.name] ?? "—"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((value) => {
              const state = valueState(opt.name, value);
              const isSel = selected[opt.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(opt.name, value)}
                  disabled={!variants.some((v) => v.options[opt.name] === value)}
                  aria-pressed={isSel}
                  className={cn(
                    "min-w-12 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all",
                    isSel ? "border-acma bg-acma/15 text-white ring-1 ring-acma" : "border-line-strong text-silver hover:border-silver hover:text-white",
                    state !== "ok" && "text-silver-dim line-through decoration-acma/70",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="text-sm" aria-live="polite">
        {!variant ? (
          <span className="text-silver-dim">Esta combinación no está disponible.</span>
        ) : !canBuy ? (
          <span className="font-semibold text-silver-dim">Agotado por ahora · consúltanos por WhatsApp</span>
        ) : variant.trackStock && variant.stock <= 5 ? (
          <span className="font-semibold text-acma">{variant.stock === 1 ? "¡Solo queda 1 unidad!" : `¡Solo quedan ${variant.stock} unidades!`}</span>
        ) : (
          <span className="text-silver">
            <span className="mr-2 inline-block size-2 rounded-full bg-white align-middle" aria-hidden />
            Disponible{variant.trackStock ? ` · ${variant.stock} unidades` : ""}
          </span>
        )}
      </p>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center rounded-lg border border-line bg-ink-soft">
          <button
            type="button"
            className="grid size-12 place-items-center text-silver hover:text-white disabled:opacity-30"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || !canBuy}
            aria-label="Disminuir cantidad"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="number"
            value={qty}
            min={1}
            max={maxQty || 1}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty || 1, Number(e.target.value) || 1)))}
            className="w-12 bg-transparent text-center font-semibold tabular-nums focus:outline-none"
            aria-label="Cantidad"
            disabled={!canBuy}
          />
          <button
            type="button"
            className="grid size-12 place-items-center text-silver hover:text-white disabled:opacity-30"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty || !canBuy}
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button variant="secondary" size="lg" className="flex-1" disabled={!canBuy || pending} onClick={() => variant && add(variant.id, qty, tracked)}>
          {pending ? <Loader2 className="size-5 animate-spin" /> : <CartIcon className="size-6" />}
          Agregar al carrito
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" className="w-full" disabled={!canBuy || pending} onClick={() => variant && buyNow(variant.id, qty, tracked)}>
          <Zap className="size-5" /> Comprar ahora
        </Button>
        <WhatsAppLink
          intent={canBuy ? "separar" : "consultar"}
          product={waProduct}
          className={buttonClass("white", "lg", "w-full")}
          ariaLabel={`${canBuy ? "Separar" : "Consultar"} ${product.name} por WhatsApp`}
        >
          <WhatsAppGlyph className="size-5 text-acma" />
          {canBuy ? "Separar por WhatsApp" : "Consultar por WhatsApp"}
        </WhatsAppLink>
      </div>
      <WhatsAppLink intent="asesoria" product={waProduct} className="inline-flex items-center gap-2 text-sm text-silver hover:text-white">
        <MessageCircleQuestion className="size-4 text-acma" />
        ¿Tienes dudas? <span className="font-semibold text-white underline decoration-acma underline-offset-4">Pide asesoría por WhatsApp</span>
      </WhatsAppLink>

      {/* Barra fija en celular: precio + compra en un toque */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-silver">{product.name}</p>
            <p className="text-lg font-extrabold leading-tight">{fmt(price)}</p>
          </div>
          <WhatsAppLink
            intent={canBuy ? "separar" : "consultar"}
            product={waProduct}
            ariaLabel="Separar por WhatsApp"
            className={buttonClass("secondary", "md", "px-3")}
          >
            <WhatsAppGlyph className="size-5 text-acma" />
          </WhatsAppLink>
          <Button size="md" disabled={!canBuy || pending} onClick={() => variant && buyNow(variant.id, qty, tracked)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            Comprar
          </Button>
        </div>
      </div>
    </div>
  );
}
