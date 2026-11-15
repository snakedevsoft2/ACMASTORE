import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";
import { can, type Permission } from "./permissions";

export const SESSION_COOKIE = "acma_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
};

export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;

  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Usuario de la sesión actual (memoizado por petición). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, phone: true, role: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  const { isActive: _ignored, ...user } = session.user;
  return user;
});

/** Para páginas y acciones de cliente: redirige a login si no hay sesión. */
export async function requireUser(returnTo = "/cuenta"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/cuenta/ingresar?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Para el panel: exige sesión y permiso; si falta, redirige o muestra 404. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/cuenta/ingresar?next=/admin`);
  // Un cliente nunca entra al panel; el personal sin el permiso puntual ve el aviso.
  if (!can(user.role, permission)) redirect(can(user.role, "admin:access") ? "/admin/sin-permiso" : "/");
  return user;
}

/** Variante para Server Actions: lanza error en lugar de redirigir. */
export async function assertPermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) throw new Error("No autorizado");
  return user;
}

/** Para login/registro: quien ya ingresó va directo a su destino. */
export async function redirectIfLoggedIn(next?: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safe ?? (user.role === "CUSTOMER" ? "/cuenta" : "/admin"));
}
