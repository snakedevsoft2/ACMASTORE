"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/session";
import { normalizeCouponCode } from "@/lib/coupons";
import { db } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { invalid, type ActionState } from "@/lib/validation";

const schema = z.object({
  code: z.string().trim().min(3, "Mínimo 3 caracteres").max(30).regex(/^[A-Za-z0-9_\- ]+$/, "Solo letras, números, guion y guion bajo"),
  description: z.string().trim().max(160).optional().transform((v) => v || null),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.string().trim().min(1, "Valor obligatorio"),
  minSubtotal: z.string().trim().optional().default(""),
  maxUses: z.string().trim().optional().default(""),
  startsAt: z.string().trim().optional().default(""),
  endsAt: z.string().trim().optional().default(""),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveCouponAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("settings:manage");
  const id = String(fd.get("id") ?? "") || null;
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;

  let value: number;
  if (c.type === "PERCENT") {
    value = Number(c.value);
    if (!Number.isInteger(value) || value < 1 || value > 100) return { error: "Porcentaje entre 1 y 100.", fieldErrors: { value: "1 a 100" } };
  } else {
    const cents = parseMoneyToCents(c.value);
    if (cents == null || cents <= 0) return { error: "Monto no válido.", fieldErrors: { value: "Monto > 0" } };
    value = cents;
  }
  const minSubtotalCents = c.minSubtotal ? parseMoneyToCents(c.minSubtotal) : null;
  if (c.minSubtotal && minSubtotalCents == null) return { error: "Mínimo no válido.", fieldErrors: { minSubtotal: "Número no válido" } };
  const maxUses = c.maxUses ? Number(c.maxUses) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "Usos máximos no válidos.", fieldErrors: { maxUses: "Entero ≥ 1" } };
  const startsAt = c.startsAt ? new Date(`${c.startsAt}T00:00:00`) : null;
  const endsAt = c.endsAt ? new Date(`${c.endsAt}T23:59:59`) : null;
  if ((startsAt && isNaN(+startsAt)) || (endsAt && isNaN(+endsAt))) return { error: "Fechas no válidas." };
  if (startsAt && endsAt && endsAt < startsAt) return { error: "La fecha final es anterior a la inicial.", fieldErrors: { endsAt: "Revisa la fecha" } };

  const code = normalizeCouponCode(c.code);
  const clash = await db.coupon.findFirst({ where: { code, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: "Ya existe un cupón con ese código.", fieldErrors: { code: "En uso" } };

  const data = { code, description: c.description, type: c.type, value, minSubtotalCents, maxUses, startsAt, endsAt, isActive: c.isActive };
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  revalidatePath("/admin/promociones");
  return { ok: true, message: "Cupón guardado." };
}

export async function deleteCouponAction(fd: FormData) {
  await assertPermission("settings:manage");
  const id = String(fd.get("id") ?? "");
  const used = await db.order.count({ where: { couponId: id } });
  // Con pedidos asociados se desactiva para conservar la trazabilidad.
  if (used > 0) await db.coupon.update({ where: { id }, data: { isActive: false } });
  else await db.coupon.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/promociones");
}
