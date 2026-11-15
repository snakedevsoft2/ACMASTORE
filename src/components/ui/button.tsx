import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 " +
  "disabled:cursor-not-allowed disabled:opacity-50 select-none whitespace-nowrap active:scale-[0.98] [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-acma text-white hover:bg-acma-dark shadow-[0_6px_24px_-10px_rgba(229,9,20,0.8)]",
  secondary: "border border-line-strong bg-transparent text-white hover:border-silver hover:bg-white/5",
  ghost: "text-silver hover:text-white hover:bg-white/5",
  danger: "border border-acma/50 text-acma hover:bg-acma hover:text-white",
  white: "bg-white text-ink hover:bg-silver",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
