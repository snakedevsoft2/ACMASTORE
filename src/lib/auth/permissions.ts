import type { Role } from "@prisma/client";

/**
 * Matriz de permisos. ADMIN tiene todo; STAFF opera la tienda pero no cambia
 * configuración, contenido legal ni roles.
 */
export const PERMISSIONS = {
  "admin:access": ["ADMIN", "STAFF"],
  "products:manage": ["ADMIN", "STAFF"],
  "orders:manage": ["ADMIN", "STAFF"],
  "customers:view": ["ADMIN", "STAFF"],
  "settings:manage": ["ADMIN"],
  "content:manage": ["ADMIN"],
  "users:manage": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  STAFF: "Operador",
  CUSTOMER: "Cliente",
};
