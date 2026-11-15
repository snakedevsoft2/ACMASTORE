import Link from "next/link";
import { Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { centsToInput, formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { deleteCouponAction } from "./actions";
import { CouponForm } from "./coupon-form";

export const metadata = { title: "Promociones" };

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function PromocionesPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requirePermission("settings:manage");
  const sp = await searchParams;
  const [coupons, settings] = await Promise.all([db.coupon.findMany({ orderBy: { createdAt: "desc" } }), getSettings()]);
  const money = { currency: settings.currency, locale: settings.locale };
  const editing = sp.editar ? coupons.find((c) => c.id === sp.editar) : null;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Promociones"
        description="Cupones de descuento para el checkout. Para descuentos por producto usa el “precio anterior” en cada producto; para anunciar una promoción usa la barra de anuncio en Configuración."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div>
          {coupons.length === 0 ? (
            <Empty>Aún no hay cupones.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th className="text-right">Usos</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.endsAt && c.endsAt < now;
                  const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="font-mono font-semibold">{c.code}</span>
                        {c.description && <span className="block text-xs text-silver-dim">{c.description}</span>}
                      </td>
                      <td>
                        {c.type === "PERCENT" ? `${c.value}%` : formatMoney(c.value, money)}
                        {c.minSubtotalCents && <span className="block text-xs text-silver-dim">mín. {formatMoney(c.minSubtotalCents, money)}</span>}
                      </td>
                      <td className="text-xs text-silver">
                        {c.startsAt ? formatDate(c.startsAt, settings.locale) : "—"} → {c.endsAt ? formatDate(c.endsAt, settings.locale) : "sin fin"}
                      </td>
                      <td className="text-right tabular-nums">
                        {c.usedCount}
                        {c.maxUses != null && ` / ${c.maxUses}`}
                      </td>
                      <td>
                        {!c.isActive ? <Badge tone="dark">Inactivo</Badge> : expired ? <Badge tone="outline">Vencido</Badge> : exhausted ? <Badge tone="outline">Agotado</Badge> : <Badge tone="red">Activo</Badge>}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <Link href={`/admin/promociones?editar=${c.id}`} className="mr-3 text-sm text-silver hover:text-white">
                          Editar
                        </Link>
                        <form action={deleteCouponAction} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <Button variant="ghost" size="sm" title={c.usedCount > 0 ? "Tiene pedidos: se desactivará" : "Eliminar"}>
                            {c.usedCount > 0 ? "Desactivar" : "Eliminar"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
        <Panel
          title={editing ? `Editar ${editing.code}` : "Nuevo cupón"}
          actions={
            editing && (
              <Link href="/admin/promociones" className="text-sm text-silver hover:text-white">
                Cancelar
              </Link>
            )
          }
        >
          <CouponForm
            key={editing?.id ?? "new"}
            currency={settings.currency}
            values={
              editing
                ? {
                    id: editing.id,
                    code: editing.code,
                    description: editing.description ?? "",
                    type: editing.type,
                    value: editing.type === "PERCENT" ? String(editing.value) : centsToInput(editing.value),
                    minSubtotal: centsToInput(editing.minSubtotalCents),
                    maxUses: editing.maxUses?.toString() ?? "",
                    startsAt: toDateInput(editing.startsAt),
                    endsAt: toDateInput(editing.endsAt),
                    isActive: editing.isActive,
                  }
                : { code: "", description: "", type: "PERCENT", value: "", minSubtotal: "", maxUses: "", startsAt: "", endsAt: "", isActive: true }
            }
          />
        </Panel>
      </div>
    </>
  );
}
