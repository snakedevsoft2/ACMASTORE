import { PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { deleteShippingMethodAction } from "../actions";
import { ShippingMethodForm } from "../settings-forms";

export const metadata = { title: "Métodos de envío" };

export default async function EnviosPage() {
  await requirePermission("settings:manage");
  const [methods, settings] = await Promise.all([db.shippingMethod.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }), getSettings()]);
  const money = { currency: settings.currency, locale: settings.locale };
  return (
    <>
      <PageHeader title="Métodos de envío" description="Define las opciones y tarifas que verá el cliente en el checkout." />
      <div className="grid gap-6 lg:grid-cols-2">
        {methods.map((m) => (
          <Panel
            key={m.id}
            title={m.name}
            description={`${m.priceCents === 0 ? "Gratis" : formatMoney(m.priceCents, money)}${m.freeOverCents ? ` · gratis desde ${formatMoney(m.freeOverCents, money)}` : ""}`}
            actions={<Badge tone={m.isActive ? "red" : "dark"}>{m.isActive ? "Activo" : "Inactivo"}</Badge>}
          >
            <ShippingMethodForm m={m} />
            <form action={deleteShippingMethodAction} className="mt-3 border-t border-line pt-3 text-right">
              <input type="hidden" name="id" value={m.id} />
              <Button variant="ghost" size="sm">
                Eliminar
              </Button>
            </form>
          </Panel>
        ))}
        <Panel title="Nuevo método de envío">
          <ShippingMethodForm />
        </Panel>
      </div>
    </>
  );
}
