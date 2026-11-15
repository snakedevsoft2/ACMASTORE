import "server-only";
import { db } from "@/lib/db";
import { emailLayout, escapeHtml as esc, sendMail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { orderNumber, siteUrl } from "@/lib/utils";

async function load(orderId: string) {
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id: orderId }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) return null;
  const fmt = (c: number) => formatMoney(c, { currency: order.currency, locale: settings.locale });
  return { order, settings, fmt, label: orderNumber(order.number) };
}

function itemsTable(order: NonNullable<Awaited<ReturnType<typeof load>>>) {
  const { order: o, fmt } = order;
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#ffffff">${esc(i.productName)}${i.variantName ? ` <span style="color:#BFC3C9">(${esc(i.variantName)})</span>` : ""} × ${i.quantity}</td><td style="padding:6px 0;text-align:right;color:#ffffff">${fmt(i.totalCents)}</td></tr>`,
    )
    .join("");
  const line = (label: string, v: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? "color:#ffffff;font-weight:700" : ""}">${label}</td><td style="padding:4px 0;text-align:right;${strong ? "color:#ffffff;font-weight:700" : ""}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2A2A2A;border-bottom:1px solid #2A2A2A;margin:16px 0;padding:8px 0">${rows}</table>
<table width="100%" cellpadding="0" cellspacing="0">
${line("Subtotal", fmt(o.subtotalCents))}
${o.discountCents > 0 ? line(`Descuento${o.couponCode ? ` (${esc(o.couponCode)})` : ""}`, `− ${fmt(o.discountCents)}`) : ""}
${line(`Envío (${esc(o.shippingMethodName)})`, o.shippingCents === 0 ? "Gratis" : fmt(o.shippingCents))}
${line("Total", fmt(o.totalCents), true)}
</table>`;
}

export async function notifyOrderPlaced(orderId: string, accessToken: string) {
  const data = await load(orderId);
  if (!data) return;
  const { order, label } = data;
  const url = siteUrl(`/pedido/${order.id}?t=${encodeURIComponent(accessToken)}`);

  const paymentInfo =
    order.paymentProvider === "BANK_TRANSFER"
      ? "<p>Tu pedido quedará confirmado cuando verifiquemos la transferencia. Encontrarás los datos bancarios en el enlace de tu pedido.</p>"
      : order.paymentProvider === "CASH_ON_DELIVERY"
        ? "<p>Pagarás al recibir tu pedido.</p>"
        : "<p>Si aún no completaste el pago, puedes hacerlo desde el enlace de tu pedido.</p>";

  await sendMail({
    to: order.email,
    subject: `Recibimos tu pedido ${label}`,
    text: `Hola ${order.customerName}, recibimos tu pedido ${label} por ${data.fmt(order.totalCents)}. Consulta su estado en: ${url}`,
    html: emailLayout({
      title: `¡Gracias por tu compra, ${order.customerName}!`,
      bodyHtml: `<p>Recibimos tu pedido <strong style="color:#ffffff">${label}</strong>.</p>${paymentInfo}${itemsTable(data)}`,
      cta: { label: "Ver mi pedido", url },
    }),
  });

  const staffTo = process.env.ORDER_NOTIFICATION_EMAIL || data.settings.contactEmail;
  if (staffTo) {
    await sendMail({
      to: staffTo,
      subject: `Nuevo pedido ${label} — ${data.fmt(order.totalCents)}`,
      text: `Nuevo pedido ${label} de ${order.customerName} (${order.email}). Total ${data.fmt(order.totalCents)}. Método de pago: ${order.paymentMethodName}.`,
      html: emailLayout({
        title: `Nuevo pedido ${label}`,
        bodyHtml: `<p>${esc(order.customerName)} · ${esc(order.email)} · ${esc(order.customerPhone)}</p><p>Pago: ${esc(order.paymentMethodName)}</p>${itemsTable(data)}`,
        cta: { label: "Abrir en el panel", url: siteUrl(`/admin/pedidos/${order.id}`) },
      }),
    });
  }
}

export async function notifyOrderPaid(orderId: string) {
  const data = await load(orderId);
  if (!data) return;
  await sendMail({
    to: data.order.email,
    subject: `Pago confirmado — pedido ${data.label}`,
    text: `Confirmamos el pago de tu pedido ${data.label}. Te avisaremos cuando sea enviado.`,
    html: emailLayout({
      title: "Pago confirmado",
      bodyHtml: `<p>Confirmamos el pago de tu pedido <strong style="color:#ffffff">${data.label}</strong>. Te avisaremos cuando salga hacia tu dirección.</p>${itemsTable(data)}`,
    }),
  });
}

export async function notifyOrderShipped(orderId: string) {
  const data = await load(orderId);
  if (!data) return;
  const o = data.order;
  const tracking = o.trackingNumber
    ? `<p>Transportadora: <strong style="color:#ffffff">${esc(o.carrier || "—")}</strong><br>Guía: <strong style="color:#ffffff">${esc(o.trackingNumber)}</strong></p>`
    : "";
  await sendMail({
    to: o.email,
    subject: `Tu pedido ${data.label} va en camino`,
    text: `Tu pedido ${data.label} fue enviado.${o.trackingNumber ? ` Guía: ${o.trackingNumber} (${o.carrier || ""}).` : ""}`,
    html: emailLayout({
      title: "¡Tu pedido va en camino!",
      bodyHtml: `<p>Tu pedido <strong style="color:#ffffff">${data.label}</strong> fue enviado.</p>${tracking}`,
      cta: o.trackingUrl ? { label: "Rastrear envío", url: o.trackingUrl } : undefined,
    }),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  await sendMail({
    to,
    subject: "Restablece tu contraseña — ACMA STORE",
    text: `Hola ${name}, para crear una nueva contraseña abre este enlace (válido por 1 hora): ${url}\nSi no lo solicitaste, ignora este correo.`,
    html: emailLayout({
      title: "Restablece tu contraseña",
      bodyHtml: `<p>Hola ${esc(name)}, recibimos una solicitud para restablecer tu contraseña. El enlace es válido por 1 hora.</p><p>Si no la solicitaste, ignora este correo: tu cuenta sigue segura.</p>`,
      cta: { label: "Crear nueva contraseña", url },
    }),
  });
}
