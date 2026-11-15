import Link from "next/link";
import { LayoutDashboard, LogOut, MapPin, Package, Settings, UserCog } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Container } from "@/components/ui/misc";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

const links = [
  { href: "/cuenta", label: "Resumen", icon: LayoutDashboard },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
  { href: "/cuenta/perfil", label: "Perfil y seguridad", icon: UserCog },
];

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Container className="py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acma">Mi cuenta</p>
        <h1 className="font-display text-4xl font-extrabold uppercase italic">Hola, {user.name.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Mi cuenta" className="h-fit rounded-xl border border-line bg-carbon p-2">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-silver hover:bg-white/5 hover:text-white">
                  <Icon className="size-4 text-acma" /> {label}
                </Link>
              </li>
            ))}
            {can(user.role, "admin:access") && (
              <li>
                <Link href="/admin" className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-white hover:bg-white/5">
                  <Settings className="size-4 text-acma" /> Panel de administración
                </Link>
              </li>
            )}
            <li>
              <form action={logoutAction}>
                <button className="flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-silver hover:bg-white/5 hover:text-acma">
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
