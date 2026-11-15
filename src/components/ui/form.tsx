"use client";

import { useFormStatus } from "react-dom";
import { startTransition, useActionState, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { compressFormDataImages, MAX_REQUEST_BYTES } from "@/lib/client-image";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";
import { Button } from "./button";

export const inputClass =
  "w-full rounded-lg border border-line bg-ink-soft px-3.5 h-11 text-sm text-white placeholder:text-silver-dim " +
  "transition-colors focus:border-acma focus:outline-none focus:ring-1 focus:ring-acma aria-[invalid=true]:border-acma " +
  "disabled:opacity-60";

export function Field({
  label,
  name,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block text-sm font-medium text-white">
        {label}
        {required && <span className="ml-0.5 text-acma">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs font-medium text-acma" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-silver-dim">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  error,
  className,
  ...props
}: ComponentProps<"input"> & { error?: string }) {
  return (
    <input
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${props.name}-error` : undefined}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}

export function Textarea({ error, className, ...props }: ComponentProps<"textarea"> & { error?: string }) {
  return (
    <textarea
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      className={cn(inputClass, "h-auto min-h-24 py-2.5", className)}
      {...props}
    />
  );
}

export function Select({ error, className, ...props }: ComponentProps<"select"> & { error?: string }) {
  return (
    <select
      id={props.id ?? props.name}
      aria-invalid={error ? true : undefined}
      className={cn(inputClass, "appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23BFC3C9' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    />
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-silver", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#E50914]" {...props} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Como useActionState, pero enviando desde onSubmit:
 * - React no limpia el formulario cuando el servidor devuelve errores de validación.
 * - Las fotos se comprimen en el navegador antes del envío (límite de 4,5 MB de Vercel).
 */
export function useFormAction(
  action: (state: ActionState, fd: FormData) => Promise<ActionState>,
  initial: ActionState = {},
) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(action, initial);
  const [preparing, setPreparing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Se lee de inmediato: currentTarget deja de estar disponible tras el primer await.
    let fd = new FormData(e.currentTarget);
    setClientError(null);
    const hasFiles = Array.from(fd.values()).some((v) => v instanceof File && v.size > 0);
    if (hasFiles) {
      setPreparing(true);
      try {
        const prepared = await compressFormDataImages(fd);
        if (prepared.bytes > MAX_REQUEST_BYTES) {
          setClientError("Las fotos pesan demasiado para un solo envío (máx. 4 MB). Sube menos fotos ahora y agrega el resto después.");
          return;
        }
        fd = prepared.fd;
      } finally {
        setPreparing(false);
      }
    }
    startTransition(() => dispatch(fd));
  };

  const merged: ActionState = clientError ? { ...state, ok: false, message: undefined, error: clientError } : state;
  return [merged, onSubmit, pending || preparing] as const;
}

export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: { ok?: boolean; error?: string; message?: string } | undefined }) {
  if (!state) return null;
  if (state.error)
    return (
      <div role="alert" className="rounded-lg border border-acma/40 bg-acma/10 px-4 py-3 text-sm text-white">
        {state.error}
      </div>
    );
  if (state.message)
    return (
      <div role="status" className="rounded-lg border border-line-strong bg-white/5 px-4 py-3 text-sm text-white">
        {state.message}
      </div>
    );
  return null;
}
