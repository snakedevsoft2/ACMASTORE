import type { OrderStatus, PaymentProviderCode, PaymentStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pago pendiente",
  PAID: "Pagado",
  FAILED: "Pago fallido",
  REFUNDED: "Reembolsado",
};

export const PROVIDER_LABELS: Record<PaymentProviderCode, string> = {
  STRIPE: "Stripe (tarjeta)",
  MERCADOPAGO: "Mercado Pago",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH_ON_DELIVERY: "Contra entrega",
};

/** Pasos visibles para el cliente en el seguimiento. */
export const TRACKING_STEPS: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

/** Transiciones de estado permitidas desde el admin. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
