import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/misc";
import type { CartView } from "@/lib/cart";
import type { PublicSettings } from "@/lib/settings";
import { AccountLink, CartButton, CategoriesMenu, MobileMenu, SearchForm, type NavCategory } from "./header-client";
import { HIDDEN_IN_WHATSAPP_MODE, NAV_LINKS } from "./nav-links";
import { socialLinks } from "@/components/brand/social-icons";
import { CartDrawer } from "./cart-drawer";

export function Header({
  settings,
  categories,
  userName,
  cart,
}: {
  settings: PublicSettings;
  categories: NavCategory[];
  userName: string | null;
  cart: CartView;
}) {
  const links = settings.whatsappOnly ? NAV_LINKS.filter((l) => !HIDDEN_IN_WHATSAPP_MODE.includes(l.href)) : NAV_LINKS;
  const [inicio, tienda, ...rest] = links;
  return (
    <>
      {settings.announcement && (
        <div className="bg-acma text-center text-xs font-semibold uppercase tracking-wider text-white">
          <Container className="py-2">{settings.announcement}</Container>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md supports-[backdrop-filter]:bg-ink/75">
        <Container className="flex h-[72px] items-center gap-2 lg:h-20 lg:gap-6">
          <MobileMenu categories={categories} userName={userName} socials={socialLinks(settings)} simple={settings.whatsappOnly} />
          <Link href="/" className="shrink-0" aria-label={`${settings.storeName} — inicio`}>
            <Logo logoUrl={settings.logoUrl} storeName={settings.storeName} className="size-14 lg:size-16" priority />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-5 lg:flex">
            {[inicio, tienda].map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-silver transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
            <CategoriesMenu categories={categories} />
            {rest.slice(0, 2).map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-silver transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          <Suspense fallback={<div className="ml-auto hidden h-10 flex-1 md:block" />}>
            <SearchForm className="ml-auto hidden w-full max-w-sm md:block" />
          </Suspense>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {!settings.whatsappOnly && <AccountLink name={userName} />}
            <CartButton count={cart.count} />
          </div>
        </Container>
        <Container className="pb-3 md:hidden">
          <Suspense fallback={<div className="h-10" />}>
            <SearchForm />
          </Suspense>
        </Container>
      </header>
      <CartDrawer cart={cart} />
    </>
  );
}
