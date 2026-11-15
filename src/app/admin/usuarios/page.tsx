import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { PromoteForm, UserRoleForm } from "../content-forms";

export const metadata = { title: "Usuarios y roles" };

export default async function UsuariosPage() {
  const me = await requirePermission("users:manage");
  const [team, settings] = await Promise.all([
    db.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Usuarios y roles" description="Quién puede entrar al panel. Los cambios de rol cierran las sesiones abiertas de esa persona." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol actual</th>
              <th>Desde</th>
              <th className="text-right">Cambiar</th>
            </tr>
          </thead>
          <tbody>
            {team.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="font-medium">{u.name}</span>
                  {u.id === me.id && <span className="ml-1 text-xs text-acma">(tú)</span>}
                  <span className="block text-xs text-silver-dim">{u.email}</span>
                </td>
                <td>
                  {ROLE_LABELS[u.role]}
                  {!u.isActive && <span className="ml-1 text-xs text-acma">desactivado</span>}
                </td>
                <td className="text-silver">{formatDate(u.createdAt, settings.locale)}</td>
                <td>
                  <UserRoleForm userId={u.id} role={u.role} isActive={u.isActive} self={u.id === me.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="space-y-6">
          <Panel title="Agregar al equipo" description="La persona debe crear primero su cuenta en la tienda.">
            <PromoteForm />
          </Panel>
          <Panel title="Permisos por rol">
            <ul className="space-y-2 text-sm text-silver">
              <li>
                <strong className="text-white">Administrador:</strong> todo, incluida configuración, pagos, envíos, promociones, páginas y usuarios.
              </li>
              <li>
                <strong className="text-white">Operador:</strong> dashboard, productos, categorías, inventario, pedidos y clientes.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
