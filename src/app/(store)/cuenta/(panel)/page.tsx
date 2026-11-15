import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrdersList } from "./orders-list";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default async function CuentaPage() {
  const user = await requireUser();
  const [orders, orderCount, defaultAddress, settings] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, include: { _count: { select: { items: true } } } }),
    db.order.count({ where: { userId: user.id } }),
    db.address.findFirst({ where: { userId: user.id, isDefault: true } }),
    getSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-carbon p-5">
          <p className="text-sm text-silver">Datos de contacto</p>
          <p className="mt-2 font-semibold">{user.name}</p>
          <p className="text-sm text-silver">{user.email}</p>
          {user.phone && <p className="text-sm text-silver">{user.phone}</p>}
          <Link href="/cuenta/perfil" className="mt-3 inline-block text-sm text-white underline decoration-acma">
            Editar
          </Link>
        </div>
        <div className="rounded-xl border border-line bg-carbon p-5">
          <p className="flex items-center gap-2 text-sm text-silver">
            <MapPin className="size-4 text-acma" /> Dirección principal
          </p>
          {defaultAddress ? (
            <>
              <p className="mt-2 font-semibold">{defaultAddress.fullName}</p>
              <p className="text-sm text-silver">
                {defaultAddress.line1}, {defaultAddress.city}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-silver">Aún no tienes direcciones guardadas.</p>
          )}
          <Link href="/cuenta/direcciones" className="mt-3 inline-block text-sm text-white underline decoration-acma">
            Gestionar direcciones
          </Link>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold uppercase">Pedidos recientes</h2>
          {orderCount > 3 && (
            <Link href="/cuenta/pedidos" className="text-sm text-silver hover:text-white">
              Ver todos ({orderCount})
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={<Package />} title="Aún no tienes pedidos" action={<ButtonLink href="/tienda">Ir a la tienda</ButtonLink>} />
        ) : (
          <OrdersList orders={orders} locale={settings.locale} />
        )}
      </section>
    </div>
  );
}
