import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "../auth-forms";
import { AuthTitle } from "../auth-title";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecuperarPage() {
  return (
    <>
      <AuthTitle title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva contraseña." />
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-silver">
        <Link href="/cuenta/ingresar" className="hover:text-white">
          ← Volver a ingresar
        </Link>
      </p>
    </>
  );
}
