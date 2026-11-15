import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-extrabold italic text-acma">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Página no encontrada</h1>
      <Link href="/" className="mt-8 rounded-lg bg-acma px-6 py-3 font-semibold text-white hover:bg-acma-dark">
        Volver al inicio
      </Link>
    </main>
  );
}
