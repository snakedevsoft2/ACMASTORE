"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { isProviderConfigured, providerRequirements } from "@/lib/payments";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import { invalid, type ActionState } from "@/lib/validation";

const optUrl = z
  .union([z.literal(""), z.string().trim().url("URL no válida").refine((u) => /^https:\/\//i.test(u), "Debe empezar por https://")])
  .transform((v) => v || null);
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** Acepta el código solo o la etiqueta <meta ... content="CODIGO"> completa. */
const verificationCode = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => {
    if (!v) return null;
    const m = v.match(/content=["']([^"']+)["']/i);
    return (m ? m[1] : v).trim().slice(0, 120) || null;
  })
  .refine((v) => v == null || /^[A-Za-z0-9_\-]+$/.test(v), "Código no válido");

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  slogan: z.string().trim().min(2).max(80),
  contactEmail: z.union([z.literal(""), z.string().trim().email("Correo no válido")]).transform((v) => v || null),
  contactPhone: optText(30),
  whatsapp: z.union([z.literal(""), z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Número no válido (incluye el indicativo, ej. +57…)")]).transform((v) => v || null),
  address: optText(300),
  businessHours: optText(200),
  instagramUrl: optUrl,
  facebookUrl: optUrl,
  tiktokUrl: optUrl,
  xUrl: optUrl,
  youtubeUrl: optUrl,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Código ISO de 3 letras (ej. COP, USD)"),
  locale: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Formato ej. es-CO"),
  country: z.string().trim().min(2).max(60),
  announcement: optText(160),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  gaMeasurementId: z.union([z.literal(""), z.string().trim().regex(/^G-[A-Z0-9]+$/, "Formato G-XXXXXXX")]).transform((v) => v || null),
  googleAdsId: z.union([z.literal(""), z.string().trim().regex(/^AW-\d+$/, "Formato AW-123456789")]).transform((v) => v || null),
  googleAdsPurchaseLabel: optText(60),
  whatsappOnly: z.preprocess((v) => v === "on", z.boolean()),
  metaPixelId: z.union([z.literal(""), z.string().trim().regex(/^\d{8,20}$/, "El ID del Pixel son solo números")]).transform((v) => v || null),
  seoTitle: optText(70),
  seoDescription: optText(170),
  googleSiteVerification: verificationCode,
  facebookDomainVerification: verificationCode,
});

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("settings:manage");
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    new Intl.NumberFormat(parsed.data.locale, { style: "currency", currency: parsed.data.currency }).format(1);
  } catch {
    return { error: "La combinación de moneda e idioma no es válida.", fieldErrors: { currency: "Moneda no reconocida" } };
  }

  const current = await db.storeSettings.findUnique({ where: { id: 1 } });
  let logoUrl: string | null | undefined;
  const logo = fd.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = (await saveImage(logo, { maxSize: 600, quality: 90 })).url;
    } catch (err) {
      return { error: err instanceof UploadError ? err.message : "No se pudo procesar el logotipo.", fieldErrors: { logo: "Archivo no válido" } };
    }
  } else if (fd.get("removeLogo") === "on") {
    logoUrl = null;
  }

  await db.storeSettings.upsert({
    where: { id: 1 },
    update: { ...parsed.data, ...(logoUrl !== undefined ? { logoUrl } : {}) },
    create: { id: 1, ...parsed.data, ...(logoUrl !== undefined ? { logoUrl } : {}) },
  });
  if (logoUrl !== undefined && current?.logoUrl) await deleteImage(current.logoUrl);

  revalidatePath("/", "layout");
  return { ok: true, message: "Configuración guardada." };
}

const paymentSchema = z.object({
  provider: z.enum(["STRIPE", "MERCADOPAGO", "BANK_TRANSFER", "CASH_ON_DELIVERY"]),
  displayName: z.string().trim().min(2, "Nombre obligatorio").max(60),
  description: optText(200),
  instructions: optText(3000),
  sortOrder: z.coerce.number().int().min(0).max(99),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function savePaymentMethodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("settings:manage");
  const parsed = paymentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const p = parsed.data;
  if (p.isActive && !isProviderConfigured(p.provider)) {
    return { error: `No se puede activar: faltan las variables de entorno ${providerRequirements(p.provider).join(", ")} en el servidor.` };
  }
  if (p.isActive && p.provider === "BANK_TRANSFER" && !p.instructions) {
    return { error: "Para activar la transferencia, escribe los datos bancarios en las instrucciones.", fieldErrors: { instructions: "Obligatorio para activar" } };
  }
  await db.paymentMethodConfig.update({ where: { provider: p.provider }, data: p });
  revalidatePath("/admin/configuracion/pagos");
  revalidatePath("/checkout");
  return { ok: true, message: "Método de pago guardado." };
}

const shippingSchema = z.object({
  name: z.string().trim().min(2, "Nombre obligatorio").max(80),
  description: optText(200),
  price: z.string().trim().min(1, "Precio obligatorio (usa 0 si es gratis)"),
  freeOver: z.string().trim().optional().default(""),
  estimatedDays: optText(60),
  sortOrder: z.coerce.number().int().min(0).max(99),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveShippingMethodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("settings:manage");
  const id = String(fd.get("id") ?? "") || null;
  const parsed = shippingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const s = parsed.data;
  const priceCents = parseMoneyToCents(s.price);
  if (priceCents == null || priceCents < 0) return { error: "Precio no válido.", fieldErrors: { price: "Número ≥ 0" } };
  const freeOverCents = s.freeOver ? parseMoneyToCents(s.freeOver) : null;
  if (s.freeOver && (freeOverCents == null || freeOverCents <= 0)) return { error: "Monto para envío gratis no válido.", fieldErrors: { freeOver: "Número > 0 o vacío" } };

  const data = { name: s.name, description: s.description, priceCents, freeOverCents, estimatedDays: s.estimatedDays, sortOrder: s.sortOrder, isActive: s.isActive };
  if (id) await db.shippingMethod.update({ where: { id }, data });
  else await db.shippingMethod.create({ data });
  revalidatePath("/admin/configuracion/envios");
  return { ok: true, message: "Método de envío guardado." };
}

export async function deleteShippingMethodAction(fd: FormData) {
  await assertPermission("settings:manage");
  const id = String(fd.get("id") ?? "");
  // Los pedidos conservan el nombre y costo del envío; la relación queda en null.
  await db.shippingMethod.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/configuracion/envios");
}
