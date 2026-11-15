"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold italic text-acma">Ups</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-silver">Ocurrió un error inesperado. Intenta de nuevo; si el problema continúa, contáctanos.</p>
      {error.digest && <p className="mt-2 text-xs text-silver-dim">Código: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="rounded-lg bg-acma px-6 py-3 font-semibold text-white hover:bg-acma-dark">
          Reintentar
        </button>
        <a href="/" className="rounded-lg border border-line-strong px-6 py-3 font-semibold text-white hover:border-silver">
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
