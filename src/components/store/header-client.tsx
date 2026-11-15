"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, User, X } from "lucide-react";
import { CartIcon } from "@/components/brand/brand-icons";
import { useStore } from "./store-provider";
import { cn } from "@/lib/utils";
import { BrandEmblem } from "@/components/brand/logo";
import { SocialIcon, type SocialName } from "@/components/brand/social-icons";
import { HIDDEN_IN_WHATSAPP_MODE, NAV_LINKS } from "./nav-links";

export type NavCategory = { id: string; name: string; slug: string; children: { id: string; name: string; slug: string }[] };


export function SearchForm({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const current = pathname.startsWith("/tienda") ? (params.get("q") ?? "") : "";
  return (
    <form action="/tienda" method="get" role="search" className={cn("relative", className)}>
      <label htmlFor="header-search" className="sr-only">
        Buscar productos
      </label>
      <input
        id="header-search"
        name="q"
        type="search"
        defaultValue={current}
        key={current}
        autoFocus={autoFocus}
        placeholder="Buscar productos…"
        className="h-10 w-full rounded-full border border-line bg-carbon pl-4 pr-11 text-sm text-white placeholder:text-silver-dim transition-colors focus:border-acma focus:outline-none"
        maxLength={80}
      />
      <button
        type="submit"
        className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-acma text-white transition-colors hover:bg-acma-dark"
        aria-label="Buscar"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}

export function CartButton({ count }: { count: number }) {
  const { openCart } = useStore();
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative grid size-10 place-items-center rounded-lg text-white transition-colors hover:bg-white/5 hover:text-acma"
      aria-label={`Abrir carrito (${count} productos)`}
    >
      <CartIcon className="size-7" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-acma px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function AccountLink({ name }: { name: string | null }) {
  return (
    <Link
      href={name ? "/cuenta" : "/cuenta/ingresar"}
      className="flex h-10 items-center gap-2 rounded-lg px-2 text-white transition-colors hover:bg-white/5 hover:text-acma"
      aria-label={name ? `Mi cuenta (${name})` : "Ingresar a mi cuenta"}
    >
      <User className="size-5" />
      <span className="hidden max-w-28 truncate text-sm xl:inline">{name ? name.split(" ")[0] : "Ingresar"}</span>
    </Link>
  );
}

export function CategoriesMenu({ categories }: { categories: NavCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-20 items-center gap-1 text-sm font-medium text-silver transition-colors hover:text-white group-focus-within:text-white"
        aria-haspopup="true"
      >
        Categorías <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 w-64 translate-y-2 rounded-xl border border-line bg-carbon p-2 opacity-0 shadow-2xl transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        {categories.map((c) => (
          <div key={c.id}>
            <Link href={`/tienda/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5 hover:text-acma">
              {c.name}
            </Link>
            {c.children.map((ch) => (
              <Link key={ch.id} href={`/tienda/${ch.slug}`} className="block rounded-lg px-3 py-1.5 pl-6 text-sm text-silver hover:bg-white/5 hover:text-white">
                {ch.name}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export type SocialLink = { name: SocialName; label: string; url: string };

export function MobileMenu({
  categories,
  userName,
  socials = [],
  simple = false,
}: {
  categories: NavCategory[];
  userName: string | null;
  socials?: SocialLink[];
  simple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/5 lg:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      <div className={cn("fixed inset-0 z-[60] lg:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-black/70 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <nav
          aria-label="Menú principal"
          className={cn(
            "absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto border-r border-line bg-ink p-5 transition-transform duration-300",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <BrandEmblem className="size-14" />
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-silver hover:text-white" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
          </div>
          <ul className="space-y-1">
            {NAV_LINKS.filter((l) => !simple || !HIDDEN_IN_WHATSAPP_MODE.includes(l.href)).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-lg px-3 py-2.5 font-medium text-white hover:bg-white/5 hover:text-acma">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {categories.length > 0 && (
            <>
              <p className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-[0.2em] text-acma">Categorías</p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/tienda/${c.slug}`} className="block rounded-lg px-3 py-2 text-silver hover:bg-white/5 hover:text-white">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {socials.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.2em] text-acma">Síguenos</p>
              <div className="flex flex-wrap gap-2 px-3">
                {socials.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid size-11 place-items-center rounded-lg border border-line text-silver hover:border-acma hover:bg-acma hover:text-white">
                    <SocialIcon name={s.name} />
                  </a>
                ))}
              </div>
            </div>
          )}
          {!simple && (
            <div className="mt-auto border-t border-line pt-4">
              <Link href={userName ? "/cuenta" : "/cuenta/ingresar"} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-white hover:bg-white/5">
                <User className="size-5" /> {userName ? "Mi cuenta" : "Ingresar / Registrarme"}
              </Link>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
