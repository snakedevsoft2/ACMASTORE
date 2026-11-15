import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/tokens";
import { ResetForm } from "../auth-forms";
import { AuthTitle } from "../auth-title";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const record = token && token.length >= 20 ? await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } }) : null;
  const valid = record && !record.usedAt && record.expiresAt > new Date();

  return (
    <>
      <AuthTitle title="Nueva contraseña" />
      {valid ? (
        <ResetForm token={token!} />
      ) : (
        <div className="space-y-4 text-sm text-silver">
          <p>El enlace no es válido o ya expiró. Los enlaces de recuperación duran 1 hora y solo pueden usarse una vez.</p>
          <Link href="/cuenta/recuperar" className="font-semibold text-white hover:text-acma">
            Solicitar un nuevo enlace →
          </Link>
        </div>
      )}
    </>
  );
}
