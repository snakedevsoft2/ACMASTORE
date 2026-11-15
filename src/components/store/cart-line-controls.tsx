"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { track } from "@/components/analytics";
import { useStore } from "./store-provider";
import type { CartLine } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function CartLineControls({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const [pending, start] = useTransition();
  const { toast } = useStore();
  const max = line.maxQty;

  const setQty = (q: number) =>
    start(async () => {
      const res = await updateCartItemAction(line.itemId, q);
      if (!res.ok && res.error) toast(res.error, "error");
    });

  const remove = () =>
    start(async () => {
      const res = await removeCartItemAction(line.itemId);
      if (!res.ok && res.error) toast(res.error, "error");
      else
        track("remove_from_cart", {
          items: [{ item_id: line.productId, item_name: line.productName, item_variant: line.variantName ?? undefined, price: line.unitPriceCents / 100, quantity: line.quantity }],
        });
    });

  return (
    <div className={cn("flex items-center gap-3", pending && "pointer-events-none opacity-60")}>
      <div className="flex items-center rounded-lg border border-line bg-ink-soft">
        <button
          type="button"
          onClick={() => setQty(line.quantity - 1)}
          disabled={line.quantity <= 1}
          className={cn("grid place-items-center text-silver hover:text-white disabled:opacity-30", compact ? "size-8" : "size-10")}
          aria-label={`Quitar una unidad de ${line.productName}`}
        >
          <Minus className="size-3.5" />
        </button>
        <span className={cn("min-w-8 text-center text-sm font-semibold tabular-nums", compact && "min-w-6")} aria-live="polite">
          {line.quantity}
        </span>
        <button
          type="button"
          onClick={() => setQty(line.quantity + 1)}
          disabled={line.quantity >= max}
          className={cn("grid place-items-center text-silver hover:text-white disabled:opacity-30", compact ? "size-8" : "size-10")}
          aria-label={`Agregar una unidad de ${line.productName}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={remove}
        className="inline-flex items-center gap-1 text-xs text-silver-dim transition-colors hover:text-acma"
        aria-label={`Eliminar ${line.productName} del carrito`}
      >
        <Trash2 className="size-4" />
        {!compact && "Eliminar"}
      </button>
    </div>
  );
}
