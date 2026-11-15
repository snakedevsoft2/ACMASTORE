import "server-only";
import type { PaymentMethodConfig, PaymentProviderCode } from "@prisma/client";
import { db } from "@/lib/db";
import { mercadoPagoProvider } from "./mercadopago";
import { stripeProvider } from "./stripe";
import type { OnlinePaymentProvider, OnlineProviderCode } from "./types";

const ONLINE: Record<OnlineProviderCode, OnlinePaymentProvider> = {
  STRIPE: stripeProvider,
  MERCADOPAGO: mercadoPagoProvider,
};

export function isOnlineProvider(code: PaymentProviderCode): code is OnlineProviderCode {
  return code === "STRIPE" || code === "MERCADOPAGO";
}

export function getOnlineProvider(code: OnlineProviderCode): OnlinePaymentProvider {
  return ONLINE[code];
}

/** Los métodos manuales no necesitan credenciales; los en línea sí. */
export function isProviderConfigured(code: PaymentProviderCode): boolean {
  return isOnlineProvider(code) ? ONLINE[code].isConfigured() : true;
}

export function providerRequirements(code: PaymentProviderCode): string[] {
  return isOnlineProvider(code) ? ONLINE[code].requiredEnv : [];
}

/** Métodos que el cliente puede usar: activos en el admin y con credenciales. */
export async function getAvailablePaymentMethods(): Promise<PaymentMethodConfig[]> {
  const configs = await db.paymentMethodConfig.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return configs.filter((c) => isProviderConfigured(c.provider));
}
