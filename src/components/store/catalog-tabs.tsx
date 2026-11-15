"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ProductCardData } from "@/lib/catalog";
import type { MoneyFormat } from "@/lib/money";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

const PER_TAB = 24;

/** Catálogo con pestañas: "Todos" y una por categoría. Cambia al instante, sin recargar. */
export function CatalogTabs({
  categories,
  products,
  money,
}: {
  categories: Array<{ slug: string; name: string; count: number }>;
  products: ProductCardData[];
  money: MoneyFormat;
}) {
  const [active, setActive] = useState<string>("todos");
  const tabs = [{ slug: "todos", name: "Todos", count: products.length }, ...categories];

  const visible = useMemo(
    () => (active === "todos" ? products : products.filter((p) => p.categorySlug === active)).slice(0, PER_TAB),
    [active, products],
  );
  const current = tabs.find((t) => t.slug === active)!;
  const seeAll = active === "todos" ? "/tienda" : `/tienda/${active}`;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Categorías del catálogo"
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => (
          <button
            key={t.slug}
            role="tab"
            type="button"
            aria-selected={active === t.slug}
            aria-controls="catalogo-panel"
            onClick={() => setActive(t.slug)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
              active === t.slug
                ? "border-acma bg-acma text-white shadow-[0_6px_20px_-8px_rgba(229,9,20,0.9)]"
                : "border-line-strong bg-carbon text-silver hover:border-silver hover:text-white",
            )}
          >
            {t.name}
            <span className={cn("rounded-full px-1.5 text-[11px] font-bold", active === t.slug ? "bg-white/20" : "bg-ink text-silver-dim")}>{t.count}</span>
          </button>
        ))}
      </div>

      <div id="catalogo-panel" role="tabpanel" key={active} className="animate-fade-up">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} money={money} priority={i < 4 && active === "todos"} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link href={seeAll} className={buttonClass("secondary", "lg", "group")}>
          Ver {current.slug === "todos" ? "todo el catálogo" : `todo en ${current.name}`} ({current.count})
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
