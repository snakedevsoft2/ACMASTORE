import Link from "next/link";
import type { Order } from "@prisma/client";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-parts";
import { formatMoney } from "@/lib/money";
import { formatDate, orderNumber } from "@/lib/utils";

export function OrdersList({ orders, locale }: { orders: Array<Order & { _count: { items: number } }>; locale: string }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-carbon">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/cuenta/pedidos/${o.number}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 transition-colors hover:bg-white/[0.03]">
            <div className="min-w-32">
              <p className="font-semibold">{orderNumber(o.number)}</p>
              <p className="text-xs text-silver">{formatDate(o.createdAt, locale)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OrderStatusBadge status={o.status} />
              <PaymentStatusBadge status={o.paymentStatus} />
            </div>
            <p className="ml-auto text-right">
              <span className="block font-semibold">{formatMoney(o.totalCents, { currency: o.currency, locale })}</span>
              <span className="text-xs text-silver">
                {o._count.items} {o._count.items === 1 ? "producto" : "productos"}
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
