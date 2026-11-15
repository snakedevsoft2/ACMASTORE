"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  CreditCard,
  ExternalLink,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { BrandEmblem } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Package; adminOnly?: boolean; badge?: number };

export function AdminShell({
  user,
  isAdmin,
  pendingOrders,
  logout,
  children,
}: {
  user: { name: string; roleLabel: string };
  isAdmin: boolean;
  pendingOrders: number;
  logout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const groups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: "General",
      items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Ventas",
      items: [
        { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, badge: pendingOrders },
        { href: "/admin/clientes", label: "Clientes", icon: Users },
        { href: "/admin/promociones", label: "Promociones", icon: Tag, adminOnly: true },
      ],
    },
    {
      title: "Catálogo",
      items: [
        { href: "/admin/productos", label: "Productos", icon: Package },
        { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
        { href: "/admin/inventario", label: "Inventario", icon: Boxes },
      ],
    },
    {
      title: "Configuración",
      items: [
        { href: "/admin/configuracion", label: "Tienda", icon: Store, adminOnly: true },
        { href: "/admin/configuracion/pagos", label: "Métodos de pago", icon: CreditCard, adminOnly: true },
        { href: "/admin/configuracion/envios", label: "Métodos de envío", icon: Truck, adminOnly: true },
        { href: "/admin/paginas", label: "Páginas", icon: FileText, adminOnly: true },
        { href: "/admin/testimonios", label: "Testimonios", icon: MessageSquareQuote, adminOnly: true },
        { href: "/admin/usuarios", label: "Usuarios y roles", icon: ShieldCheck, adminOnly: true },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : href === "/admin/configuracion" ? pathname === href : pathname.startsWith(href);

  const nav = (
    <nav aria-label="Administración" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((g) => {
        const items = g.items.filter((i) => isAdmin || !i.adminOnly);
        if (items.length === 0) return null;
        return (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-silver-dim">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, badge }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive(href) ? "bg-acma/15 font-semibold text-white ring-1 ring-inset ring-acma/40" : "text-silver hover:bg-white/5 hover:text-white",
                    )}
                    aria-current={isActive(href) ? "page" : undefined}
                  >
                    <Icon className={cn("size-4", isActive(href) ? "text-acma" : "")} />
                    <span className="flex-1">{label}</span>
                    {badge ? <span className="rounded-full bg-acma px-1.5 text-[11px] font-bold text-white">{badge}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <Link href="/" target="_blank" className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-silver hover:bg-white/5 hover:text-white">
        <ExternalLink className="size-4" /> Ver tienda
      </Link>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs text-silver-dim">{user.roleLabel}</p>
        </div>
        <form action={logout}>
          <button className="rounded-md p-2 text-silver hover:bg-white/5 hover:text-acma" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink lg:flex">
        <Link href="/admin" className="flex h-20 items-center gap-3 border-b border-line px-5">
          <BrandEmblem className="size-14" priority />
          <span className="font-display text-lg font-bold uppercase leading-none">
            ACMA <span className="text-acma">Store</span>
          </span>
          <span className="rounded bg-acma px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
        </Link>
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white hover:bg-white/5" aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
        <BrandEmblem className="size-11" />
        <span className="rounded bg-acma px-1.5 py-0.5 text-[10px] font-bold uppercase">Admin</span>
      </header>
      <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-black/70 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside className={cn("absolute left-0 top-0 flex h-full w-72 flex-col border-r border-line bg-ink transition-transform", open ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-14 items-center justify-between border-b border-line px-4">
            <BrandEmblem className="size-11" />
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-silver" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
          </div>
          {nav}
          {footer}
        </aside>
      </div>

      <main className="min-w-0 bg-ink-soft">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
