import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Container, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { getCategoryShowcase, PAGE_SIZE, SORT_OPTIONS, searchProducts, type CatalogParams, type SortKey } from "@/lib/catalog";
import { CategoryChips } from "./category-nav";
import { centsToInput, parseMoneyToCents, type MoneyFormat } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CatalogFilters } from "./catalog-filters";
import { ProductGrid } from "./product-card";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseCatalogParams(sp: RawSearchParams): CatalogParams {
  const sort = first(sp.orden) as SortKey;
  const min = parseMoneyToCents(first(sp.min));
  const max = parseMoneyToCents(first(sp.max));
  const page = Number.parseInt(first(sp.pagina), 10);
  return {
    q: first(sp.q).trim().slice(0, 80) || undefined,
    category: first(sp.categoria) || undefined,
    sort: sort in SORT_OPTIONS ? sort : "relevancia",
    min: min != null && min >= 0 ? min : undefined,
    max: max != null && max > 0 ? max : undefined,
    inStock: first(sp.disponible) === "1",
    offers: first(sp.ofertas) === "1",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

function buildQuery(params: CatalogParams, overrides: Partial<CatalogParams>, includeCategory: boolean) {
  const p = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (includeCategory && p.category) qs.set("categoria", p.category);
  if (p.sort && p.sort !== "relevancia") qs.set("orden", p.sort);
  if (p.min != null) qs.set("min", centsToInput(p.min));
  if (p.max != null) qs.set("max", centsToInput(p.max));
  if (p.inStock) qs.set("disponible", "1");
  if (p.offers) qs.set("ofertas", "1");
  if (p.page && p.page > 1) qs.set("pagina", String(p.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

type CategoryLink = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };

export async function CatalogView({
  params,
  basePath,
  title,
  description,
  categories,
  activeCategory,
  money,
  breadcrumb,
}: {
  params: CatalogParams;
  basePath: string;
  title: string;
  description?: string | null;
  categories: CategoryLink[];
  activeCategory?: string;
  money: MoneyFormat;
  breadcrumb?: React.ReactNode;
}) {
  const [result, showcase] = await Promise.all([searchProducts(params), getCategoryShowcase()]);
  const totalProducts = showcase.reduce((s, c) => s + c.count, 0);
  const fixedCategory = basePath !== "/tienda";
  const pageHref = (page: number) => `${basePath}${buildQuery(params, { page }, !fixedCategory)}`;
  const from = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(result.page * PAGE_SIZE, result.total);
  const hasFilters = Boolean(params.q || params.min != null || params.max != null || params.inStock || params.offers);

  return (
    <div>
      <div className="relative overflow-hidden border-b border-line bg-carbon/40">
        <div className="absolute -right-16 top-0 h-full w-32 skew-x-[-20deg] bg-acma/15" aria-hidden />
        <Container className="relative py-5 sm:py-10">
          <div className="hidden sm:block">{breadcrumb}</div>
          <h1 className="font-display text-3xl font-extrabold uppercase italic tracking-tight sm:text-5xl">{title}</h1>
          {description && <p className="mt-2 hidden max-w-2xl text-silver sm:block">{description}</p>}
          <div className="mt-4 sm:mt-6">
            <CategoryChips categories={showcase} active={activeCategory} total={totalProducts} />
          </div>
        </Container>
      </div>

      <Container className="grid gap-4 py-4 sm:gap-8 sm:py-8 lg:grid-cols-[260px_1fr]">
        <CatalogFilters
          action={basePath}
          params={{
            q: params.q ?? "",
            category: fixedCategory ? "" : (params.category ?? ""),
            sort: params.sort ?? "relevancia",
            min: params.min != null ? centsToInput(params.min) : "",
            max: params.max != null ? centsToInput(params.max) : "",
            inStock: Boolean(params.inStock),
            offers: Boolean(params.offers),
          }}
          sortOptions={SORT_OPTIONS}
          categories={categories}
          activeCategory={activeCategory}
          currency={money.currency}
        />

        <section aria-label="Productos">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-silver sm:mb-5">
            <p>
              {result.total === 0
                ? "Sin resultados"
                : `Mostrando ${from}–${to} de ${result.total} ${result.total === 1 ? "producto" : "productos"}`}
              {params.q && (
                <>
                  {" "}
                  para <span className="font-semibold text-white">“{params.q}”</span>
                </>
              )}
            </p>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title={hasFilters ? "No encontramos productos" : "Aún no hay productos aquí"}
              description={
                hasFilters
                  ? "Prueba con otra búsqueda o quita algunos filtros."
                  : "Estamos preparando el catálogo. Vuelve pronto."
              }
              action={hasFilters ? <ButtonLink href={basePath} variant="secondary">Quitar filtros</ButtonLink> : undefined}
            />
          ) : (
            <ProductGrid products={result.items} money={money} priorityCount={4} />
          )}

          {result.pageCount > 1 && (
            <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-1.5">
              <PageLink href={pageHref(result.page - 1)} disabled={result.page <= 1} label="Página anterior">
                <ChevronLeft className="size-4" />
              </PageLink>
              {Array.from({ length: result.pageCount }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === result.pageCount || Math.abs(n - result.page) <= 1)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-silver-dim">…</span>}
                    <PageLink href={pageHref(n)} active={n === result.page} label={`Página ${n}`}>
                      {n}
                    </PageLink>
                  </span>
                ))}
              <PageLink href={pageHref(result.page + 1)} disabled={result.page >= result.pageCount} label="Página siguiente">
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </section>
      </Container>
    </div>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  label,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const cls = cn(
    "grid size-10 place-items-center rounded-lg border text-sm font-semibold transition-colors",
    active ? "border-acma bg-acma text-white" : "border-line text-silver hover:border-silver hover:text-white",
    disabled && "pointer-events-none opacity-30",
  );
  if (disabled) return <span className={cls} aria-hidden>{children}</span>;
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
