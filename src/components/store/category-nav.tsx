import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import type { CategoryShowcase } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Accesos rápidos por categoría con foto (portada). Desplazable en celular. */
export function CategoryStrip({ categories, total }: { categories: CategoryShowcase[]; total: number }) {
  if (categories.length === 0) return null;
  const item = "group flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 text-center sm:w-[100px]";
  const ring = "relative grid size-[72px] place-items-center overflow-hidden rounded-full border-2 transition-all duration-300 sm:size-[92px]";
  return (
    <nav aria-label="Compra por categoría" className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-5 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <Link href="/tienda" className={item}>
        <span className={cn(ring, "border-acma bg-acma text-white group-hover:scale-105")}>
          <LayoutGrid className="size-8" />
        </span>
        <span className="text-xs font-semibold leading-tight text-white sm:text-sm">
          Todos <span className="block text-[11px] font-normal text-silver-dim">{total} productos</span>
        </span>
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={`/tienda/${c.slug}`} className={item}>
          <span className={cn(ring, "border-line-strong bg-white group-hover:scale-105 group-hover:border-acma")}>
            {c.imageUrl ? (
              <Image src={c.imageUrl} alt="" fill sizes="96px" className="object-contain p-1.5" />
            ) : (
              <LayoutGrid className="size-7 text-ink" />
            )}
          </span>
          <span className="text-xs font-semibold leading-tight text-white group-hover:text-acma sm:text-sm">
            {c.name} <span className="block text-[11px] font-normal text-silver-dim">{c.count}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** Pestañas de categoría para la tienda (enlaces). */
export function CategoryChips({ categories, active, total }: { categories: CategoryShowcase[]; active?: string; total: number }) {
  if (categories.length === 0) return null;
  const chip = (isActive: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
      isActive ? "border-acma bg-acma text-white" : "border-line-strong bg-carbon text-silver hover:border-silver hover:text-white",
    );
  return (
    <nav aria-label="Categorías" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      <Link href="/tienda" className={chip(!active)} aria-current={!active ? "page" : undefined}>
        Todos <span className="text-[11px] opacity-70">{total}</span>
      </Link>
      {categories.map((c) => (
        <Link key={c.id} href={`/tienda/${c.slug}`} className={chip(active === c.slug)} aria-current={active === c.slug ? "page" : undefined}>
          {c.name} <span className="text-[11px] opacity-70">{c.count}</span>
        </Link>
      ))}
    </nav>
  );
}
