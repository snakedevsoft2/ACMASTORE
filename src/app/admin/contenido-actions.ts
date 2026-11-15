"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { assertPermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { invalid, type ActionState } from "@/lib/validation";

// ─────────────── Páginas (Nosotros, FAQ, políticas…) ───────────────

const pageSchema = z.object({
  title: z.string().trim().min(2).max(100),
  content: z.string().trim().min(20, "El contenido es demasiado corto").max(60_000),
  seoDescription: z.string().trim().max(170).optional().transform((v) => v || null),
  isPublished: z.preprocess((v) => v === "on", z.boolean()),
});

export async function savePageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("content:manage");
  const id = String(fd.get("id") ?? "");
  const parsed = pageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const page = await db.page.update({ where: { id }, data: { ...parsed.data, isReviewed: true } });
  revalidatePath(`/${page.slug}`);
  revalidatePath("/admin/paginas");
  return { ok: true, message: "Página guardada y marcada como revisada." };
}

// ─────────────── Testimonios ───────────────

const testimonialSchema = z.object({
  author: z.string().trim().min(2).max(80),
  location: z.string().trim().max(80).optional().transform((v) => v || null),
  content: z.string().trim().min(10, "Escribe el testimonio").max(600),
  rating: z.coerce.number().int().min(1).max(5),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
  confirmReal: z.literal("on", { errorMap: () => ({ message: "Confirma que es un testimonio real" }) }),
});

export async function saveTestimonialAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("content:manage");
  const id = String(fd.get("id") ?? "") || null;
  const parsed = testimonialSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { confirmReal: _c, ...data } = parsed.data;
  if (id) await db.testimonial.update({ where: { id }, data });
  else await db.testimonial.create({ data });
  revalidatePath("/");
  revalidatePath("/admin/testimonios");
  if (id) redirect("/admin/testimonios");
  return { ok: true, message: "Testimonio guardado." };
}

export async function deleteTestimonialAction(fd: FormData) {
  await assertPermission("content:manage");
  await db.testimonial.delete({ where: { id: String(fd.get("id") ?? "") } }).catch(() => undefined);
  revalidatePath("/");
  revalidatePath("/admin/testimonios");
}

// ─────────────── Usuarios y roles ───────────────

export async function setUserRoleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const me = await assertPermission("users:manage");
  const userId = String(fd.get("userId") ?? "");
  const role = String(fd.get("role") ?? "") as Role;
  const isActive = fd.get("isActive") === "on";
  if (!["ADMIN", "STAFF", "CUSTOMER"].includes(role)) return { error: "Rol no válido." };
  if (userId === me.id && (role !== "ADMIN" || !isActive)) return { error: "No puedes quitarte tu propio rol de administrador ni desactivarte." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuario no encontrado." };
  if (target.role === "ADMIN" && (role !== "ADMIN" || !isActive)) {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) return { error: "Debe quedar al menos un administrador activo." };
  }
  await db.user.update({ where: { id: userId }, data: { role, isActive } });
  // Cambios de rol o desactivación cierran sus sesiones abiertas.
  if (target.role !== role || !isActive) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Usuario actualizado." };
}

export async function promoteByEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("users:manage");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const role = String(fd.get("role") ?? "STAFF") as Role;
  if (!["ADMIN", "STAFF"].includes(role)) return { error: "Rol no válido." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { error: "No existe una cuenta con ese correo. La persona debe registrarse primero en la tienda." };
  await db.user.update({ where: { id: user.id }, data: { role } });
  await db.session.deleteMany({ where: { userId: user.id } });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: `${user.name} ahora es ${role === "ADMIN" ? "administrador" : "operador"}.` };
}
