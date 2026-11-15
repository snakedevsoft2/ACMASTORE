import { describe, expect, it } from "vitest";
import { centsToInput, discountPercent, formatMoney, parseMoneyToCents } from "@/lib/money";
import { absoluteUrl, orderNumber, parseOrderNumber, slugify } from "@/lib/utils";

describe("parseMoneyToCents", () => {
  it.each([
    ["45000", 4_500_000],
    ["45.000", 4_500_000],
    ["1.250.000", 125_000_000],
    ["45,000", 4_500_000],
    ["19.99", 1999],
    ["19,9", 1990],
    ["1.234,56", 123_456],
    ["1,234.56", 123_456],
    ["$ 89.900", 8_990_000],
    ["0", 0],
  ])("%s → %i", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "-", null, undefined])("rechaza %s", (input) => {
    expect(parseMoneyToCents(input as string)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("COP sin decimales", () => {
    expect(formatMoney(8_990_000, { currency: "COP", locale: "es-CO" }).replace(/\s/g, " ")).toMatch(/89\.900/);
  });
  it("USD con centavos", () => {
    expect(formatMoney(1999, { currency: "USD", locale: "en-US" })).toBe("$19.99");
  });
});

describe("utilidades", () => {
  it("centsToInput", () => {
    expect(centsToInput(4_500_000)).toBe("45000");
    expect(centsToInput(1999)).toBe("19.99");
    expect(centsToInput(null)).toBe("");
  });
  it("discountPercent", () => {
    expect(discountPercent(8000, 10000)).toBe(20);
    expect(discountPercent(10000, 10000)).toBeNull();
    expect(discountPercent(10000, null)).toBeNull();
  });
  it("slugify", () => {
    expect(slugify("Cascos  Integrales & Más — Ñandú")).toBe("cascos-integrales-mas-nandu");
  });
  it("número de pedido", () => {
    expect(orderNumber(42)).toBe("ACMA-000042");
    expect(parseOrderNumber("acma-000042")).toBe(42);
    expect(parseOrderNumber("42")).toBe(42);
    expect(parseOrderNumber("ACMA-x")).toBeNull();
  });
  it("absoluteUrl respeta URLs de Vercel Blob y completa rutas locales", () => {
    const blob = "https://abc123.public.blob.vercel-storage.com/uploads/2026/11/x.webp";
    expect(absoluteUrl(blob)).toBe(blob);
    expect(absoluteUrl("/uploads/2026/11/x.webp")).toMatch(/^https?:\/\/[^/]+\/uploads\/2026\/11\/x\.webp$/);
  });
});
