"use client";

import { useState } from "react";
import { formatMoney, type MoneyFormat } from "@/lib/money";

export type DailySales = { date: string; cents: number; orders: number };

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 64 };

/** Ventas pagadas por día (una sola serie: sin leyenda, el título la nombra). */
export function SalesChart({ data, money }: { data: DailySales[]; money: MoneyFormat }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.cents), 0);
  const fmt = (c: number) => formatMoney(c, money);
  const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(money.locale, { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

  if (max === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong px-4 py-12 text-center text-sm text-silver">
        Aún no hay ventas pagadas en los últimos 30 días. La gráfica se llenará con los pagos confirmados.
      </p>
    );
  }

  // Escala con tope "redondo" para tres líneas de referencia legibles.
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const niceMax = Math.ceil(max / magnitude) * magnitude;
  const ticks = [0, niceMax / 2, niceMax];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / data.length;
  const barW = Math.min(24, slot - 2); // 2px de aire entre columnas
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
  const compact = (c: number) =>
    new Intl.NumberFormat(money.locale, { style: "currency", currency: money.currency, notation: "compact", maximumFractionDigits: 1 }).format(c / 100);

  const h = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ventas pagadas por día, últimos 30 días">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#2a2a2a" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8b9097">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const top = y(d.cents);
            const bh = PAD.top + innerH - top;
            const r = Math.min(4, bh);
            const path =
              bh <= 0
                ? ""
                : `M${x},${PAD.top + innerH}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${PAD.top + innerH}Z`;
            return (
              <g key={d.date}>
                {path && <path d={path} fill="#E50914" opacity={hover == null || hover === i ? 1 : 0.45} />}
                {/* Zona de interacción más grande que la columna */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${dayLabel(d.date, { day: "numeric", month: "long" })}: ${fmt(d.cents)}, ${d.orders} pedidos`}
                />
                {/* Etiquetas semanales + el último día; se omite la semanal que chocaría con la final. */}
                {((i % 7 === 0 && i < data.length - 4) || i === data.length - 1) && (
                  <text
                    x={i === data.length - 1 ? PAD.left + (i + 1) * slot : PAD.left + i * slot + slot / 2}
                    y={H - 8}
                    textAnchor={i === data.length - 1 ? "end" : "middle"}
                    fontSize={11}
                    fill="#8b9097"
                  >
                    {dayLabel(d.date, { day: "numeric", month: "short" })}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#3a3a3a" />
        </svg>
        {h && hover != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line-strong bg-ink px-3 py-2 text-xs shadow-xl"
            style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
          >
            <p className="text-silver">{dayLabel(h.date, { weekday: "short", day: "numeric", month: "short" })}</p>
            <p className="text-sm font-semibold text-white">{fmt(h.cents)}</p>
            <p className="text-silver">
              {h.orders} {h.orders === 1 ? "pedido" : "pedidos"}
            </p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-silver hover:text-white">Ver como tabla</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-silver">
              <tr>
                <th className="py-1">Día</th>
                <th className="py-1 text-right">Pedidos</th>
                <th className="py-1 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter((d) => d.cents > 0)
                .map((d) => (
                  <tr key={d.date} className="border-t border-line">
                    <td className="py-1">{dayLabel(d.date, { day: "numeric", month: "short" })}</td>
                    <td className="py-1 text-right tabular-nums">{d.orders}</td>
                    <td className="py-1 text-right tabular-nums">{fmt(d.cents)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
