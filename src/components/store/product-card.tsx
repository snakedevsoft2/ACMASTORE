import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { ProductCardData } from "@/lib/catalog";
import { discountPercent, formatMoney, type MoneyFormat } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CardActions } from "./product-actions";

/**
 * Tarjeta de producto. Las fotos se muestran completas (sin recorte) sobre fondo blanco,
 * porque suelen traer el nombre y el precio impresos.
 */
export function ProductCard({ product: p, money, priority }: { product: ProductCardData; money: MoneyFormat; priority?: boolean }) {
  const pct = discountPercent(p.priceCents, p.compareAtCents);
  const href = `/producto/${p.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-carbon transition-all duration-300 hover:-translate-y-1 hover:border-acma/60 hover:shadow-[0_20px_40px_-20px_rgba(229,9,20,0.5)]">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-white" tabIndex={-1} aria-hidden>
        {p.image ? (
          <>
            <Image
              src={p.image.url}
              alt={p.image.alt}
              fill
              priority={priority}
              sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw"
              className={cn(
                "object-contain p-1.5 transition-all duration-500 group-hover:scale-[1.03]",
                p.hoverImage && "group-hover:opacity-0",
                !p.available && "opacity-60 grayscale",
              )}
            />
            {p.hoverImage && (
              <Image
                src={p.hoverImage.url}
                alt=""
                fill
                sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw"
                className="object-contain p-1.5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-silver">
            <ImageOff className="size-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {pct && <span className="rounded-md bg-acma px-2 py-1 text-xs font-extrabold text-white shadow">-{pct}%</span>}
          {!p.available && <span className="rounded-md bg-ink px-2 py-1 text-xs font-bold uppercase text-white">Agotado</span>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {p.categoryName && <p className="text-[10px] font-bold uppercase tracking-wider text-acma sm:text-[11px]">{p.categoryName}</p>}
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-white sm:text-[15px]">
          <Link href={href} className="hover:text-acma focus:outline-none focus-visible:underline">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          {p.priceVaries && <span className="text-xs text-silver">Desde</span>}
          <span className="text-lg font-extrabold tracking-tight text-white sm:text-xl">{formatMoney(p.priceCents, money)}</span>
          {p.compareAtCents && <span className="text-xs text-silver-dim line-through sm:text-sm">{formatMoney(p.compareAtCents, money)}</span>}
        </div>
        {p.lowStock != null && (
          <p className="text-xs font-semibold text-acma">{p.lowStock === 1 ? "¡Última unidad!" : `¡Últimas ${p.lowStock} unidades!`}</p>
        )}
        <div className="mt-1.5">
          <CardActions
            product={{
              id: p.id,
              name: p.name,
              slug: p.slug,
              categoryName: p.categoryName,
              priceCents: p.priceCents,
              available: p.available,
              quickAddVariantId: p.quickAddVariantId,
            }}
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, money, priorityCount = 0 }: { products: ProductCardData[]; money: MoneyFormat; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} money={money} priority={i < priorityCount} />
      ))}
    </div>
  );
}
