"use client";

import { Check } from "lucide-react";
import { useFormAction } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { adjustStockAction } from "./actions";

export function StockForm({ variantId, stock }: { variantId: string; stock: number }) {
  const [state, onSubmit, pending] = useFormAction(adjustStockAction);
  return (
    <form onSubmit={onSubmit} className="flex items-center justify-end gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <input
        name="stock"
        type="number"
        min={0}
        defaultValue={stock}
        key={stock}
        aria-label="Nuevo stock"
        className="h-9 w-20 rounded-md border border-line bg-ink-soft px-2 text-right text-sm tabular-nums focus:border-acma focus:outline-none"
      />
      <input name="note" placeholder="Motivo (opcional)" aria-label="Motivo" maxLength={200} className="hidden h-9 w-40 rounded-md border border-line bg-ink-soft px-2 text-sm focus:border-acma focus:outline-none md:block" />
      <button
        disabled={pending}
        className={cn("grid size-9 place-items-center rounded-md border border-line-strong text-silver hover:border-acma hover:text-white disabled:opacity-40", state.ok && "border-acma text-acma")}
        aria-label="Guardar stock"
        title={state.error ?? "Guardar"}
      >
        <Check className="size-4" />
      </button>
      {state.error && <span className="text-xs text-acma">{state.error}</span>}
    </form>
  );
}
