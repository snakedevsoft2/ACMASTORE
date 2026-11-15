import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfLoggedIn } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { RegisterForm } from "../auth-forms";
import { AuthTitle } from "../auth-title";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  if ((await getSettings()).whatsappOnly) redirect("/");
  await redirectIfLoggedIn(sp.next);
  return (
    <>
      <AuthTitle title="Crear cuenta" subtitle="Guarda tus direcciones y sigue tus pedidos en un solo lugar." />
      <RegisterForm next={sp.next} />
      <p className="mt-6 text-center text-sm text-silver">
        ¿Ya tienes cuenta?{" "}
        <Link href={sp.next ? `/cuenta/ingresar?next=${encodeURIComponent(sp.next)}` : "/cuenta/ingresar"} className="font-semibold text-white hover:text-acma">
          Ingresa
        </Link>
      </p>
    </>
  );
}
