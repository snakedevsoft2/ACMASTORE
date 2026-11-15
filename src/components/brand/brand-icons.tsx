"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Íconos de botones según las piezas compartidas por ACMA STORE, en vector:
 * WhatsApp y Facebook con acabado 3D brillante, y el carrito de compras con rejilla.
 * Cada instancia usa ids propios para sus degradados (evita conflictos entre íconos ocultos).
 */

export function WhatsApp3D({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={cn("size-6 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4BE277" />
          <stop offset="0.55" stopColor="#1FB34A" />
          <stop offset="1" stopColor="#0B7F2E" />
        </linearGradient>
        <linearGradient id={`${id}ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#ECEFEA" />
          <stop offset="1" stopColor="#BFC6C2" />
        </linearGradient>
        <radialGradient id={`${id}core`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6CF294" />
          <stop offset="0.45" stopColor="#25C257" />
          <stop offset="1" stopColor="#0C8A33" />
        </radialGradient>
        <linearGradient id={`${id}phone`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9DEDB" />
        </linearGradient>
      </defs>
      {/* Burbuja exterior verde */}
      <path d="M7 94 L15.6 67 A42 42 0 1 1 34.3 84 Z" fill={`url(#${id}rim)`} stroke="#0A6E28" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Aro plateado + núcleo verde */}
      <path d="M15 85.5 L21.7 63.5 A35 35 0 1 1 37.2 77.7 Z" fill={`url(#${id}core)`} stroke={`url(#${id}ring)`} strokeWidth="6.5" strokeLinejoin="round" />
      {/* Teléfono */}
      <path
        transform="translate(29.5 23.5) scale(1.88)"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
        fill={`url(#${id}phone)`}
        stroke="#B9C2BD"
        strokeWidth="0.35"
      />
      {/* Brillo */}
      <ellipse cx="40" cy="25" rx="20" ry="8" fill="#FFFFFF" opacity="0.28" transform="rotate(-22 40 25)" />
    </svg>
  );
}

export function Facebook3D({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={cn("size-6 shrink-0", className)} aria-hidden>
      <defs>
        <radialGradient id={`${id}fb`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#6FA8FF" />
          <stop offset="0.5" stopColor="#2A6CF0" />
          <stop offset="1" stopColor="#1A3BB0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}fb)`} stroke="#16339A" strokeWidth="1.2" />
      {/* Reflejos */}
      <path d="M68 12.5 A40 40 0 0 1 89 38" fill="none" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="36" cy="24" rx="18" ry="7" fill="#FFFFFF" opacity="0.18" transform="rotate(-25 36 24)" />
      {/* f */}
      <path
        d="M55 82 V54 H64 L65.5 43 H55 V36 C55 33 56.2 31 60 31 H66 V21.6 C64.5 21.3 61.6 21 58 21 C50 21 45 25.8 45 34.5 V43 H36 V54 H45 V82 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Carrito con canasta en rejilla y ruedas sólidas. Usa el color del texto (currentColor). */
export function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-5 shrink-0", className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12 H12 L21 44 H48" strokeWidth="5" />
      <path d="M14 21 H58 L53 38 H18.6" strokeWidth="5" />
      <path d="M25.5 21 L27 38 M36.5 21 V38 M47.5 21 L45.5 38 M16.5 29.5 H55.5" strokeWidth="3.6" />
      <circle cx="24.5" cy="53" r="4.6" fill="currentColor" stroke="none" />
      <circle cx="43.5" cy="53" r="4.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
