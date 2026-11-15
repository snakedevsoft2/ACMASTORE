import "server-only";
import Stripe from "stripe";
import { PaymentProviderError, type CheckoutRequest, type OnlinePaymentProvider } from "./types";

// Monedas que Stripe expresa sin decimales (el importe va en unidades, no centavos).
const STRIPE_ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentProviderError("Stripe no está configurado (STRIPE_SECRET_KEY).");
  client ??= new Stripe(key);
  return client;
}

export function toStripeAmount(cents: number, currency: string): number {
  return STRIPE_ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(cents / 100) : cents;
}

export function fromStripeAmount(amount: number, currency: string): number {
  return STRIPE_ZERO_DECIMAL.has(currency.toUpperCase()) ? amount * 100 : amount;
}

export const stripeProvider: OnlinePaymentProvider = {
  code: "STRIPE",
  label: "Stripe",
  requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  isConfigured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),

  async createCheckout(req: CheckoutRequest) {
    const stripe = getStripe();
    // Stripe admite expiración entre 30 min y 24 h.
    const maxExpiry = Date.now() + 23.5 * 3600_000;
    const expiresAt = Math.floor(Math.min(req.expiresAt.getTime(), maxExpiry) / 1000);
    const sep = req.returnUrl.includes("?") ? "&" : "?";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.email,
      client_reference_id: req.orderId,
      metadata: { orderId: req.orderId },
      payment_intent_data: { metadata: { orderId: req.orderId } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: req.currency.toLowerCase(),
            unit_amount: toStripeAmount(req.totalCents, req.currency),
            product_data: { name: `Pedido ${req.orderLabel} — ACMA STORE` },
          },
        },
      ],
      success_url: `${req.returnUrl}${sep}pago=retorno`,
      cancel_url: `${req.returnUrl}${sep}pago=cancelado`,
      expires_at: expiresAt,
    });

    if (!session.url) throw new PaymentProviderError("Stripe no devolvió la URL de pago.");
    return { redirectUrl: session.url, reference: session.id };
  },
};
