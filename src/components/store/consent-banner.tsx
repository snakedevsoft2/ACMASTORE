"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "acma_consent";

/** Aviso de cookies con Consent Mode v2 (solo se muestra si hay analítica configurada). */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* sin almacenamiento: no se insiste */
    }
  }, []);

  const decide = (choice: "granted" | "denied") => {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* ignorar */
    }
    window.gtag?.("consent", "update", {
      ad_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice,
      analytics_storage: choice,
    });
    window.fbq?.("consent", choice === "granted" ? "grant" : "revoke");
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div role="dialog" aria-label="Preferencias de cookies" className="fixed inset-x-3 bottom-3 z-[65] mx-auto max-w-2xl animate-fade-up rounded-xl border border-line bg-carbon p-4 shadow-2xl sm:p-5">
      <p className="text-sm text-silver">
        Usamos cookies para medir visitas, mejorar la tienda y mostrarte publicidad relevante en Google, Facebook e Instagram. Puedes aceptarlas o rechazarlas.{" "}
        <Link href="/politica-de-privacidad" className="text-white underline decoration-acma">
          Más información
        </Link>
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => decide("denied")}>
          Rechazar
        </Button>
        <Button size="sm" onClick={() => decide("granted")}>
          Aceptar
        </Button>
      </div>
    </div>
  );
}
