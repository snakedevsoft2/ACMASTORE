import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function orderNumber(n: number): string {
  return `ACMA-${String(n).padStart(6, "0")}`;
}

/** Acepta "ACMA-000123", "acma000123" o "123". */
export function parseOrderNumber(input: string): number | null {
  const digits = input.trim().toUpperCase().replace(/^ACMA-?/, "");
  if (!/^\d{1,9}$/.test(digits)) return null;
  const n = Number(digits);
  return n > 0 ? n : null;
}

export function siteUrl(path = ""): string {
  // En Vercel, si no se define NEXT_PUBLIC_SITE_URL, se usa el dominio de producción del proyecto.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || vercel || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}

/** URL absoluta: respeta las que ya lo son (ej. imágenes en Vercel Blob). */
export function absoluteUrl(pathOrUrl: string): string {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : siteUrl(pathOrUrl);
}

export function formatDate(date: Date | string, locale = "es-CO", withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(d);
}

/** Lee un campo de FormData como texto recortado ("" si no existe). */
export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}
