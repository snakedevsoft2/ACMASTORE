import type { Metadata } from "next";
import { headers } from "next/headers";
import { PackageSearch } from "lucide-react";
import { OrderStatusBadge, OrderTimeline, PaymentStatusBadge } from "@/components/store/order-parts";
import { Container } from "@/components/ui/misc";
import { inputClass } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { rateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatDate, orderNumber, parseOrderNumber } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  description: "Consulta el estado de tu pedido en ACMA STORE con tu número de pedido y correo.",
};

export default async function SeguimientoPage({ searchParams }: { searchParams: Promise<{ pedido?: string; correo?: string }> }) {
  const sp = await searchParams;
  if ((await getSettings()).whatsappOnly) redirect("/");
  const numberInput = (sp.pedido ?? "").slice(0, 20);
  const email = (sp.correo ?? "").trim().toLowerCase().slice(0, 160);
  const searched = Boolean(numberInput || email);

  let error: string | null = null;
  let order = null;
  if (searched) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const n = parseOrderNumber(numberInput);
    if (!rateLimit(`track:${ip}`, 20, 10 * 60_000).ok) error = "Demasiadas consultas. Espera unos minutos.";
    else if (!n || !email) error = "Ingresa el número de pedido y el correo usado en la compra.";
    else {
      order = await db.order.findFirst({ where: { number: n, email }, include: { items: { select: { id: true, productName: true, variantName: true, quantity: true } } } });
      if (!order) error = "No encontramos un pedido con esos datos. Verifica el número y el correo.";
    }
  }
  const settings = await getSettings();

  return (
    <Container className="max-w-3xl py-12">
      <div className="mb-8 text-center">
        <PackageSearch className="mx-auto mb-3 size-12 text-acma" />
        <h1 className="font-display text-4xl font-extrabold uppercase italic">Seguimiento de pedido</h1>
        <p className="mt-2 text-silver">Ingresa tu número de pedido (ej. ACMA-000123) y el correo con el que compraste.</p>
      </div>

      <form method="get" className="grid gap-3 rounded-xl border border-line bg-carbon p-5 sm:grid-cols-[1fr_1.3fr_auto]">
        <label className="sr-only" htmlFor="pedido">
          Número de pedido
        </label>
        <input id="pedido" name="pedido" defaultValue={numberInput} placeholder="ACMA-000123" className={inputClass} required />
        <label className="sr-only" htmlFor="correo">
          Correo electrónico
        </label>
        <input id="correo" name="correo" type="email" defaultValue={email} placeholder="tu@correo.com" className={inputClass} required />
        <button className={buttonClass("primary")}>Consultar</button>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-acma/40 bg-acma/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {order && (
        <section className="mt-8 space-y-6 rounded-xl border border-line bg-carbon p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold uppercase">{orderNumber(order.number)}</h2>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <span className="ml-auto text-sm text-silver">{formatDate(order.createdAt, settings.locale)}</span>
          </div>
          <OrderTimeline status={order.status} />
          {(order.carrier || order.trackingNumber) && (
            <div className="rounded-lg border border-line bg-ink-soft p-4 text-sm">
              {order.carrier && <p>Transportadora: <strong>{order.carrier}</strong></p>}
              {order.trackingNumber && <p>Número de guía: <strong>{order.trackingNumber}</strong></p>}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline decoration-acma">
                  Rastrear con la transportadora →
                </a>
              )}
            </div>
          )}
          <ul className="divide-y divide-line text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between py-2">
                <span>
                  {i.productName}
                  {i.variantName && <span className="text-silver"> · {i.variantName}</span>}
                </span>
                <span className="text-silver">× {i.quantity}</span>
              </li>
            ))}
          </ul>
          <p className="text-right font-semibold">Total: {formatMoney(order.totalCents, { currency: order.currency, locale: settings.locale })}</p>
        </section>
      )}
    </Container>
  );
}
