import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm, ProfileForm } from "../account-forms";

export const metadata: Metadata = { title: "Perfil y seguridad", robots: { index: false } };

export default async function PerfilPage() {
  const user = await requireUser("/cuenta/perfil");
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-line bg-carbon p-5 sm:p-6">
        <h2 className="mb-5 font-display text-2xl font-bold uppercase">Datos personales</h2>
        <ProfileForm name={user.name} phone={user.phone} email={user.email} />
      </section>
      <section className="rounded-xl border border-line bg-carbon p-5 sm:p-6">
        <h2 className="mb-5 font-display text-2xl font-bold uppercase">Cambiar contraseña</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
