import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isOnlineProvider, isProviderConfigured, providerRequirements } from "@/lib/payments";
import { siteUrl } from "@/lib/utils";
import { PaymentMethodForm } from "../settings-forms";

export const metadata = { title: "Métodos de pago" };

export default async function PagosPage() {
  await requirePermission("settings:manage");
  const methods = await db.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader
        title="Métodos de pago"
        description="Las credenciales de las pasarelas se configuran en variables de entorno del servidor, nunca aquí. Los pagos en línea se confirman únicamente por webhook verificado."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {methods.map((m) => {
          const configured = isProviderConfigured(m.provider);
          const online = isOnlineProvider(m.provider);
          return (
            <Panel
              key={m.id}
              title={m.displayName}
              description={online ? "Pasarela en línea" : "Pago manual (lo confirmas tú desde el pedido)"}
              actions={
                <div className="flex gap-1.5">
                  {online && <Badge tone={configured ? "white" : "outline"}>{configured ? "Credenciales OK" : "Sin credenciales"}</Badge>}
                  <Badge tone={m.isActive && configured ? "red" : "dark"}>{m.isActive && configured ? "Activo" : "Inactivo"}</Badge>
                </div>
              }
            >
              <PaymentMethodForm m={m} configured={configured} requirements={providerRequirements(m.provider)} />
              {online && (
                <p className="mt-4 border-t border-line pt-3 text-xs text-silver-dim">
                  URL del webhook: <code className="text-silver">{siteUrl(m.provider === "STRIPE" ? "/api/webhooks/stripe" : "/api/webhooks/mercadopago")}</code>
                  {m.provider === "STRIPE" && " · eventos: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired"}
                  {m.provider === "MERCADOPAGO" && " · tópico: Pagos. Requiere que el sitio esté publicado con HTTPS."}
                </p>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
