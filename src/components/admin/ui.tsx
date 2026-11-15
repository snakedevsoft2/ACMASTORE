import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-silver hover:text-white">
            <ChevronLeft className="size-4" /> {back.label}
          </Link>
        )}
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-silver">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-carbon", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-display text-lg font-bold uppercase">{title}</h2>}
            {description && <p className="text-xs text-silver">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: "default" | "alert"; href?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-silver">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg [&_svg]:size-4", tone === "alert" ? "bg-acma text-white" : "bg-acma/15 text-acma")}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-silver-dim">{hint}</p>}
    </>
  );
  const cls = cn("block rounded-xl border bg-carbon p-5 transition-colors", tone === "alert" ? "border-acma/50" : "border-line", href && "hover:border-acma/60");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-line bg-carbon", className)}>
      <table className="w-full min-w-[640px] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-silver [&_thead]:border-b [&_thead]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line/60 [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-white/[0.02]">
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <span className="text-silver">
        Página {page} de {pageCount}
      </span>
      <Link href={href(page - 1)} aria-disabled={page <= 1} className={cn("rounded-lg border border-line p-2 hover:border-silver", page <= 1 && "pointer-events-none opacity-30")} aria-label="Anterior">
        <ChevronLeft className="size-4" />
      </Link>
      <Link href={href(page + 1)} aria-disabled={page >= pageCount} className={cn("rounded-lg border border-line p-2 hover:border-silver", page >= pageCount && "pointer-events-none opacity-30")} aria-label="Siguiente">
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-silver">{children}</p>;
}
