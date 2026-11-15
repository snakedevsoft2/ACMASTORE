/** Utilidades de dinero. Todos los importes internos son enteros en centavos. */

export type MoneyFormat = { currency: string; locale: string };

/** Monedas que en la práctica no usan decimales al mostrarse. */
const ZERO_DECIMAL_DISPLAY = new Set(["COP", "CLP", "PYG", "JPY", "KRW", "VND", "ISK", "HUF"]);

export function formatMoney(cents: number, { currency, locale }: MoneyFormat): string {
  const noDecimals = ZERO_DECIMAL_DISPLAY.has(currency.toUpperCase()) || cents % 100 === 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: noDecimals ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(noDecimals ? 0 : 2)}`;
  }
}

/**
 * Convierte lo que escribe un administrador ("45000", "45.000", "45,000.50", "$ 1.234,5")
 * a centavos. Devuelve null si no es un número válido.
 *
 * Regla: si aparecen punto y coma, el último es el separador decimal. Si aparece solo uno,
 * es decimal únicamente cuando aparece una vez y le siguen 1 o 2 dígitos.
 */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let intPart = s;
  let decPart = "";

  if (lastDot !== -1 && lastComma !== -1) {
    const decSep = lastDot > lastComma ? "." : ",";
    const idx = s.lastIndexOf(decSep);
    intPart = s.slice(0, idx).replace(/[.,]/g, "");
    decPart = s.slice(idx + 1);
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? "." : ",";
    const parts = s.split(sep);
    const tail = parts[parts.length - 1];
    if (parts.length === 2 && tail.length >= 1 && tail.length <= 2) {
      intPart = parts[0];
      decPart = tail;
    } else {
      intPart = parts.join("");
    }
  }

  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart) || (intPart + decPart).length === 0) return null;
  const cents = Number(intPart || "0") * 100 + Number((decPart + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** Centavos → texto editable en formularios del admin ("45000" o "19.99"). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function discountPercent(priceCents: number, compareAtCents: number | null | undefined): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}
