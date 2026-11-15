import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Envía un correo. Si SMTP no está configurado:
 *  - en desarrollo imprime el contenido en la consola del servidor;
 *  - en producción registra una advertencia y devuelve false.
 * Nunca lanza: un fallo de correo no debe romper un pedido ya creado.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[correo · SMTP no configurado] Para: ${mail.to}\nAsunto: ${mail.subject}\n${mail.text}\n`);
    } else {
      console.warn(`[correo] SMTP no configurado; no se envió "${mail.subject}" a ${mail.to}`);
    }
    return false;
  }
  try {
    await t.sendMail({ from: process.env.SMTP_FROM, ...mail });
    return true;
  } catch (err) {
    console.error("[correo] Error al enviar", err);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plantilla HTML con la identidad ACMA (tablas y estilos en línea para clientes de correo). */
export function emailLayout(opts: { title: string; bodyHtml: string; cta?: { label: string; url: string } }) {
  const cta = opts.cta
    ? `<p style="margin:28px 0"><a href="${esc(opts.cta.url)}" style="background:#E50914;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:700;display:inline-block">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1A1A1A;border-radius:12px;border:1px solid #2A2A2A">
<tr><td style="padding:24px 28px;border-bottom:3px solid #E50914"><span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff">ACMA</span> <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#E50914">STORE</span></td></tr>
<tr><td style="padding:28px;color:#BFC3C9;font-size:15px;line-height:1.6">
<h1 style="color:#ffffff;font-size:20px;margin:0 0 16px">${esc(opts.title)}</h1>
${opts.bodyHtml}${cta}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #2A2A2A;color:#BFC3C9;font-size:12px">ACMA STORE — TODO EN UN SOLO LUGAR</td></tr>
</table></td></tr></table></body></html>`;
}

export { esc as escapeHtml };
