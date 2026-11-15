import type { Metadata } from "next";
import { Package } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrdersList } from "../orders-list";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

export default async function MisPedidosPage() {
  const user = await requireUser("/cuenta/pedidos");
  const [orders, settings] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { items: true } } } }),
    getSettings(),
  ]);
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold uppercase">Historial de compras</h2>
      {orders.length === 0 ? (
        <EmptyState icon={<Package />} title="Aún no tienes pedidos" action={<ButtonLink href="/tienda">Ir a la tienda</ButtonLink>} />
      ) : (
        <OrdersList orders={orders} locale={settings.locale} />
      )}
    </section>
  );
}
