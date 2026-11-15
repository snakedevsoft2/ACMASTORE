"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { retryPaymentAction } from "@/app/actions/checkout";
import { track } from "@/components/analytics";
import { Button } from "@/components/ui/button";

export function RetryPaymentButton({ orderId, token, label = "Pagar ahora" }: { orderId: string; token: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await retryPaymentAction(orderId, token);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {label}
      </Button>
      {error && <p className="text-sm text-acma">{error}</p>}
    </div>
  );
}

/**
 * Evento de compra (GA4 "purchase" + conversión de Google Ads). Se envía una vez por pedido
 * y solo cuando el pedido está realmente confirmado: pago aprobado, o pedido con pago manual.
 */
export function PurchaseTracker({
  transactionId,
  value,
  currency,
  shipping,
  coupon,
  items,
  adsSendTo,
}: {
  transactionId: string;
  value: number;
  currency: string;
  shipping: number;
  coupon: string | null;
  items: Array<{ item_id: string; item_name: string; item_variant?: string; price: number; quantity: number }>;
  adsSendTo: string | null;
}) {
  useEffect(() => {
    const key = `acma_purchase_${transactionId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* sin almacenamiento: GA deduplica por transaction_id */
    }
    const t = setTimeout(() => {
      track("purchase", { transaction_id: transactionId, value, currency, shipping, coupon: coupon ?? undefined, items });
      if (adsSendTo) track("conversion", { send_to: adsSendTo, value, currency, transaction_id: transactionId });
    }, 800);
    return () => clearTimeout(t);
  }, [transactionId, value, currency, shipping, coupon, items, adsSendTo]);
  return null;
}
