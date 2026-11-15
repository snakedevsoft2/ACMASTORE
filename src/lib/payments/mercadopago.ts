import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/utils";
import { PaymentProviderError, type CheckoutRequest, type OnlinePaymentProvider } from "./types";

const API = "https://api.mercadopago.com";

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new PaymentProviderError("Mercado Pago no está configurado (MERCADOPAGO_ACCESS_TOKEN).");
  return t;
}

async function mpFetch<T>(path: string, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(init?.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PaymentProviderError(`Mercado Pago respondió ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export type MercadoPagoPayment = {
  id: number;
  status: string; // approved | pending | in_process | authorized | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
};

export function getMercadoPagoPayment(id: string): Promise<MercadoPagoPayment> {
  if (!/^\d{1,20}$/.test(id)) throw new PaymentProviderError("Id de pago inválido");
  return mpFetch<MercadoPagoPayment>(`/v1/payments/${id}`);
}

/**
 * Valida la cabecera x-signature de Mercado Pago:
 * HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;").
 */
export function verifyMercadoPagoSignature(opts: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  if (!opts.signatureHeader) return false;
  const parts = Object.fromEntries(
    opts.signatureHeader.split(",").map((kv) => {
      const [k, ...v] = kv.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = `id:${id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const mercadoPagoProvider: OnlinePaymentProvider = {
  code: "MERCADOPAGO",
  label: "Mercado Pago",
  requiredEnv: ["MERCADOPAGO_ACCESS_TOKEN"],
  isConfigured: () => Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),

  async createCheckout(req: CheckoutRequest) {
    const sep = req.returnUrl.includes("?") ? "&" : "?";
    const publicHttps = siteUrl().startsWith("https://");
    const preference = await mpFetch<{ id: string; init_point: string }>("/checkout/preferences", {
      method: "POST",
      idempotencyKey: `pref-${req.orderId}-${Date.now()}`,
      body: JSON.stringify({
        items: [
          {
            id: req.orderId,
            title: `Pedido ${req.orderLabel} — ACMA STORE`,
            quantity: 1,
            currency_id: req.currency.toUpperCase(),
            unit_price: req.totalCents / 100,
          },
        ],
        payer: { email: req.email, name: req.customerName },
        external_reference: req.orderId,
        back_urls: {
          success: `${req.returnUrl}${sep}pago=retorno`,
          pending: `${req.returnUrl}${sep}pago=retorno`,
          failure: `${req.returnUrl}${sep}pago=cancelado`,
        },
        // Mercado Pago solo acepta auto_return y notificaciones hacia URLs públicas HTTPS.
        ...(publicHttps
          ? { auto_return: "approved", notification_url: siteUrl("/api/webhooks/mercadopago") }
          : {}),
        expires: true,
        expiration_date_to: req.expiresAt.toISOString(),
        statement_descriptor: "ACMA STORE",
      }),
    });
    if (!preference.init_point) throw new PaymentProviderError("Mercado Pago no devolvió la URL de pago.");
    return { redirectUrl: preference.init_point, reference: preference.id };
  },
};
