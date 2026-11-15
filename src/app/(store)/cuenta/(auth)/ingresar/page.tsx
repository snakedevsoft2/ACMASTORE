import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfLoggedIn } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "../auth-forms";
import { AuthTitle } from "../auth-title";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

export default async function IngresarPage({ searchParams }: { searchParams: Promise<{ next?: string; restablecida?: string }> }) {
  const sp = await searchParams;
  await redirectIfLoggedIn(sp.next);
  const simple = (await getSettings()).whatsappOnly;
  const registerHref = sp.next ? `/cuenta/registro?next=${encodeURIComponent(sp.next)}` : "/cuenta/registro";
  return (
    <>
      <AuthTitle title="Ingresar" subtitle={simple ? "Acceso para la administración de la tienda." : "Accede a tus pedidos, direcciones y compras más rápidas."} />
      <LoginForm next={sp.next} notice={sp.restablecida ? "Tu contraseña fue actualizada. Ya puedes ingresar." : undefined} />
      {!simple && <p className="mt-6 text-center text-sm text-silver">
        ¿No tienes cuenta?{" "}
        <Link href={registerHref} className="font-semibold text-white hover:text-acma">
          Regístrate
        </Link>
      </p>}
    </>
  );
}
