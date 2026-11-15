import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

type Tone = "red" | "silver" | "white" | "dark" | "outline";

const tones: Record<Tone, string> = {
  red: "bg-acma text-white",
  silver: "bg-silver text-ink",
  white: "bg-white text-ink",
  dark: "bg-carbon-light text-silver border border-line",
  outline: "border border-line-strong text-silver",
};

export function Badge({ children, tone = "dark", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-acma">
            <span className="h-px w-6 bg-acma" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-silver">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-surface flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="mb-4 text-acma [&_svg]:size-10">{icon}</div>}
      <h3 className="font-display text-xl font-bold uppercase text-white">{title}</h3>
      {description && <div className="mt-2 max-w-md text-sm text-silver">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
