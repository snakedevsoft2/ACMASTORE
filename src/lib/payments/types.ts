import type { PaymentProviderCode } from "@prisma/client";

export type OnlineProviderCode = Extract<PaymentProviderCode, "STRIPE" | "MERCADOPAGO">;

export type CheckoutRequest = {
  orderId: string;
  orderLabel: string;
  email: string;
  customerName: string;
  totalCents: number;
  currency: string;
  /** URL a la que vuelve el cliente (éxito, pendiente o cancelación). */
  returnUrl: string;
  expiresAt: Date;
};

export type CheckoutResult = { redirectUrl: string; reference: string };

export interface OnlinePaymentProvider {
  code: OnlineProviderCode;
  label: string;
  /** Variables de entorno necesarias para operar. */
  requiredEnv: string[];
  isConfigured(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

export class PaymentProviderError extends Error {}
