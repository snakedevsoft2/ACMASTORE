import Image from "next/image";
import { Check, Package, Truck, X } from "lucide-react";
import type { Order, OrderItem, OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, TRACKING_STEPS } from "@/lib/labels";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/misc";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === "CANCELLED" ? "red" : status === "DELIVERED" ? "white" : status === "PENDING" ? "outline" : "silver";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: Order["paymentStatus"] }) {
  const tone = status === "PAID" ? "white" : status === "FAILED" ? "red" : status === "REFUNDED" ? "silver" : "outline";
  return <Badge tone={tone}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-acma/40 bg-acma/10 p-4">
        <X className="size-5 text-acma" />
        <p className="font-semibold">Este pedido fue cancelado.</p>
      </div>
    );
  }
  const current = TRACKING_STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Estado del pedido">
      {TRACKING_STEPS.map((s, i) => {
        const done = i <= current;
        const Icon = s === "SHIPPED" ? Truck : s === "DELIVERED" ? Package : Check;
        return (
          <li key={s} className="flex flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
            <div className="relative flex w-full items-center justify-center">
              {i > 0 && <span className={cn("absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-acma" : "bg-line")} aria-hidden />}
              <span
                className={cn(
                  "relative z-10 grid size-9 place-items-center rounded-full border-2",
                  done ? "border-acma bg-acma text-white" : "border-line bg-ink text-silver-dim",
                  i === current && "ring-4 ring-acma/25",
                )}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <span className={cn("mt-2 text-[11px] font-medium leading-tight sm:text-xs", done ? "text-white" : "text-silver-dim")}>
              {ORDER_STATUS_LABELS[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItemsTable({ order, items, money }: { order: Order; items: OrderItem[]; money: MoneyFormat }) {
  const fmt = (c: number) => formatMoney(c, money);
  return (
    <div className="rounded-xl border border-line bg-carbon">
      <ul className="divide-y divide-line">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 p-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-white">
              {it.imageUrl && <Image src={it.imageUrl} alt="" fill sizes="56px" className="object-contain p-0.5" />}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{it.productName}</p>
              <p className="text-silver">
                {it.variantName ? `${it.variantName} · ` : ""}
                {it.quantity} × {fmt(it.unitPriceCents)}
              </p>
            </div>
            <p className="text-sm font-semibold">{fmt(it.totalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-line p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-silver">Subtotal</dt>
          <dd>{fmt(order.subtotalCents)}</dd>
        </div>
        {order.discountCents > 0 && (
          <div className="flex justify-between">
            <dt className="text-silver">Descuento {order.couponCode && `(${order.couponCode})`}</dt>
            <dd className="text-acma">− {fmt(order.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-silver">Envío · {order.shippingMethodName}</dt>
          <dd>{order.shippingCents === 0 ? "Gratis" : fmt(order.shippingCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{fmt(order.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ShippingInfo({ order }: { order: Order }) {
  return (
    <div className="space-y-4 rounded-xl border border-line bg-carbon p-5 text-sm">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-acma">Entrega</h3>
        <p className="font-medium">{order.shipFullName}</p>
        <p className="text-silver">
          {order.shipLine1}
          {order.shipLine2 && `, ${order.shipLine2}`}
        </p>
        <p className="text-silver">
          {order.shipCity}, {order.shipState} {order.shipPostalCode ?? ""} · {order.shipCountry}
        </p>
        <p className="text-silver">{order.shipPhone}</p>
        {order.shipNotes && <p className="mt-1 text-silver-dim">“{order.shipNotes}”</p>}
      </div>
      {(order.trackingNumber || order.carrier) && (
        <div className="border-t border-line pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-acma">Envío</h3>
          {order.carrier && <p>Transportadora: <span className="font-medium">{order.carrier}</span></p>}
          {order.trackingNumber && <p>Número de guía: <span className="font-medium">{order.trackingNumber}</span></p>}
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-white underline decoration-acma">
              Rastrear envío →
            </a>
          )}
        </div>
      )}
      <div className="border-t border-line pt-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-acma">Pago</h3>
        <p>{order.paymentMethodName}</p>
        <div className="mt-1.5">
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>
    </div>
  );
}
