"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, verifyPasswordConstantTime } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession, requireUser } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { mergeGuestCart } from "@/lib/cart";
import { sendPasswordResetEmail } from "@/lib/order-emails";
import { siteUrl } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import {
  addressSchema,
  changePasswordSchema,
  emailSchema,
  invalid,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type ActionState,
} from "@/lib/validation";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Solo rutas internas: evita redirecciones abiertas hacia otros dominios. */
function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if ((await getSettings()).whatsappOnly) return { error: "El registro no está disponible: los pedidos se hacen por WhatsApp." };
  const rl = rateLimit(`register:${await ip()}`, 5, 60 * 60_000);
  if (!rl.ok) return { error: "Demasiados registros desde esta conexión. Intenta más tarde." };

  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, phone, password } = parsed.data;

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Ya existe una cuenta con ese correo.", fieldErrors: { email: "Este correo ya está registrado. ¿Quieres ingresar?" } };

  const user = await db.user.create({ data: { name, email, phone, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  await mergeGuestCart(user.id);
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next"), "/cuenta"));
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password } = parsed.data;

  const key = `login:${await ip()}:${email}`;
  const rl = rateLimit(key, 8, 15 * 60_000);
  if (!rl.ok) return { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(rl.retryAfterSec / 60)} minutos.` };

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPasswordConstantTime(password, user?.isActive ? user.passwordHash : null);
  if (!user || !ok) return { error: "Correo o contraseña incorrectos." };

  resetRateLimit(key);
  await createSession(user.id);
  await mergeGuestCart(user.id);
  revalidatePath("/", "layout");
  const fallback = user.role === "CUSTOMER" ? "/cuenta" : "/admin";
  redirect(safeNext(fd.get("next"), fallback));
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}

const RESET_MESSAGE =
  "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada y la carpeta de spam.";

export async function requestPasswordResetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: "Ingresa un correo válido.", fieldErrors: { email: "Correo electrónico no válido" } };
  const email = parsed.data;

  const rl = rateLimit(`reset:${await ip()}`, 5, 60 * 60_000);
  const rlEmail = rateLimit(`reset-email:${email}`, 3, 60 * 60_000);
  // Misma respuesta en todos los casos: no se revela si el correo existe.
  if (!rl.ok || !rlEmail.ok) return { ok: true, message: RESET_MESSAGE };

  const user = await db.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const token = generateToken();
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    await sendPasswordResetEmail(user.email, user.name, siteUrl(`/cuenta/restablecer?token=${token}`));
  }
  return { ok: true, message: RESET_MESSAGE };
}

export async function resetPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "El enlace no es válido o ya expiró. Solicita uno nuevo." };
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Cierra todas las sesiones abiertas con la contraseña anterior.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  redirect("/cuenta/ingresar?restablecida=1");
}

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/cuenta", "layout");
  return { ok: true, message: "Datos actualizados." };
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);

  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, full.passwordHash))) {
    return { error: "La contraseña actual no es correcta.", fieldErrors: { currentPassword: "Contraseña incorrecta" } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Cierra las demás sesiones y abre una nueva en este dispositivo.
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return { ok: true, message: "Contraseña actualizada. Cerramos tus sesiones en otros dispositivos." };
}

export async function saveAddressAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser("/cuenta/direcciones");
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const id = typeof fd.get("id") === "string" ? String(fd.get("id")) : "";

  const count = await db.address.count({ where: { userId: user.id } });
  const isDefault = parsed.data.isDefault || count === 0;

  await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) {
      const res = await tx.address.updateMany({ where: { id, userId: user.id }, data: { ...parsed.data, isDefault } });
      if (res.count === 0) throw new Error("Dirección no encontrada");
    } else {
      await tx.address.create({ data: { ...parsed.data, isDefault, userId: user.id } });
    }
  });
  revalidatePath("/cuenta/direcciones");
  redirect("/cuenta/direcciones");
}

export async function deleteAddressAction(fd: FormData) {
  const user = await requireUser("/cuenta/direcciones");
  const id = String(fd.get("id") ?? "");
  const addr = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return;
  await db.address.delete({ where: { id } });
  if (addr.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/cuenta/direcciones");
}

export async function setDefaultAddressAction(fd: FormData) {
  const user = await requireUser("/cuenta/direcciones");
  const id = String(fd.get("id") ?? "");
  const addr = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/cuenta/direcciones");
}
