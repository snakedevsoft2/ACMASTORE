import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s · Admin ACMA STORE" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("admin:access");
  const pendingOrders = await db.order.count({ where: { status: "PENDING" } });
  return (
    <AdminShell
      user={{ name: user.name, roleLabel: ROLE_LABELS[user.role] }}
      isAdmin={can(user.role, "settings:manage")}
      pendingOrders={pendingOrders}
      logout={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
