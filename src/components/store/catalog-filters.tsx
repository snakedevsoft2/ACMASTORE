"use client";

import Link from "next/link";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { inputClass } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };

/**
 * Filtros como formulario GET: funcionan sin JavaScript y generan URLs compartibles.
 * Con JavaScript, el orden y las casillas se aplican al instante.
 */
export function CatalogFilters({
  action,
  params,
  sortOptions,
  categories,
  activeCategory,
  currency,
}: {
  action: string;
  params: { q: string; category: string; sort: string; min: string; max: string; inStock: boolean; offers: boolean };
  sortOptions: Record<string, string>;
  categories: Cat[];
  activeCategory?: string;
  currency: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();

  const body = (
    <form ref={form} action={action} method="get" className="space-y-6">
      {params.q && <input type="hidden" name="q" value={params.q} />}
      {params.category && <input type="hidden" name="categoria" value={params.category} />}

      <div>
        <label htmlFor="orden" className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white">
          Ordenar por
        </label>
        <select id="orden" name="orden" defaultValue={params.sort} onChange={submit} className={inputClass}>
          {Object.entries(sortOptions).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white">Categorías</p>
          <ul className="space-y-0.5 text-sm">
            <li>
              <Link
                href="/tienda"
                className={cn("block rounded-md px-2 py-1.5 hover:bg-white/5", !activeCategory ? "font-semibold text-acma" : "text-silver hover:text-white")}
              >
                Todas
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/tienda/${c.slug}`}
                  className={cn(
                    "block rounded-md px-2 py-1.5 hover:bg-white/5",
                    activeCategory === c.slug ? "font-semibold text-acma" : "text-silver hover:text-white",
                  )}
                >
                  {c.name}
                </Link>
                {c.children.length > 0 && (
                  <ul className="ml-3 border-l border-line pl-2">
                    {c.children.map((ch) => (
                      <li key={ch.id}>
                        <Link
                          href={`/tienda/${ch.slug}`}
                          className={cn(
                            "block rounded-md px-2 py-1 text-[13px] hover:bg-white/5",
                            activeCategory === ch.slug ? "font-semibold text-acma" : "text-silver-dim hover:text-white",
                          )}
                        >
                          {ch.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white">Precio ({currency})</legend>
        <div className="flex items-center gap-2">
          <input name="min" defaultValue={params.min} inputMode="decimal" placeholder="Mínimo" aria-label="Precio mínimo" className={inputClass} />
          <span className="text-silver-dim">–</span>
          <input name="max" defaultValue={params.max} inputMode="decimal" placeholder="Máximo" aria-label="Precio máximo" className={inputClass} />
        </div>
      </fieldset>

      <div className="space-y-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-silver">
          <input type="checkbox" name="disponible" value="1" defaultChecked={params.inStock} onChange={submit} className="size-4 accent-[#E50914]" />
          Solo productos disponibles
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-silver">
          <input type="checkbox" name="ofertas" value="1" defaultChecked={params.offers} onChange={submit} className="size-4 accent-[#E50914]" />
          Solo ofertas
        </label>
      </div>

      <div className="flex gap-2">
        <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
          Aplicar
        </button>
        <Link href={action} className={buttonClass("ghost", "md")}>
          Limpiar
        </Link>
      </div>
    </form>
  );

  return (
    <aside aria-label="Filtros">
      <details className="group rounded-xl border border-line bg-carbon lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-acma" /> Filtrar y ordenar
          </span>
          <span className="text-xs text-silver group-open:hidden">Mostrar</span>
          <span className="hidden text-xs text-silver group-open:inline">Ocultar</span>
        </summary>
        <div className="border-t border-line p-4">{body}</div>
      </details>
      <div className="sticky top-24 hidden rounded-xl border border-line bg-carbon p-5 lg:block">{body}</div>
    </aside>
  );
}
