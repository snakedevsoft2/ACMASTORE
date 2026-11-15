"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { formatMoney, type MoneyFormat } from "@/lib/money";

type StoreCtx = {
  money: MoneyFormat;
  storeName: string;
  /** Número de WhatsApp de ventas (null si no está configurado). */
  whatsapp: string | null;
  /** Modo de venta "solo WhatsApp": sin cuentas ni pago en línea. */
  whatsappOnly: boolean;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toast: (message: string, tone?: "ok" | "error") => void;
};

const Ctx = createContext<StoreCtx | null>(null);

type Toast = { id: number; message: string; tone: "ok" | "error" };

export function StoreProvider({
  money,
  storeName,
  whatsapp,
  whatsappOnly,
  children,
}: {
  money: MoneyFormat;
  storeName: string;
  whatsapp: string | null;
  whatsappOnly: boolean;
  children: ReactNode;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value = useMemo<StoreCtx>(
    () => ({
      money,
      storeName,
      whatsapp,
      whatsappOnly,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      toast,
    }),
    [money, storeName, whatsapp, whatsappOnly, cartOpen, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-up pointer-events-auto max-w-md rounded-lg border px-4 py-3 text-sm font-medium shadow-2xl ${
              t.tone === "error" ? "border-acma bg-acma-dark text-white" : "border-line-strong bg-carbon text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export function useMoney() {
  const { money } = useStore();
  return useCallback((cents: number) => formatMoney(cents, money), [money]);
}
