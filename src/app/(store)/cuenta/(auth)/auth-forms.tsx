"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/app/actions/auth";
import { Checkbox, Field, FormMessage, Input, SubmitButton, useFormAction } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

function PasswordInput({ name, error, autoComplete }: { name: string; error?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} error={error} className="pr-11" required />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1 grid size-9 place-items-center text-silver hover:text-white"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, onSubmit, pending] = useFormAction(loginAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {notice && !state.error && <FormMessage state={{ message: notice }} />}
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Correo electrónico" name="email" error={e.email} required>
        <Input name="email" type="email" autoComplete="email" error={e.email} required />
      </Field>
      <Field label="Contraseña" name="password" error={e.password} required>
        <PasswordInput name="password" autoComplete="current-password" error={e.password} />
      </Field>
      <div className="text-right">
        <Link href="/cuenta/recuperar" className="text-sm text-silver hover:text-white">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, onSubmit, pending] = useFormAction(registerAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Nombre completo" name="name" error={e.name} required>
        <Input name="name" autoComplete="name" error={e.name} required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo electrónico" name="email" error={e.email} required>
          <Input name="email" type="email" autoComplete="email" error={e.email} required />
        </Field>
        <Field label="Teléfono" name="phone" error={e.phone}>
          <Input name="phone" type="tel" autoComplete="tel" error={e.phone} />
        </Field>
      </div>
      <Field label="Contraseña" name="password" error={e.password} hint="Mínimo 8 caracteres, con letras y números." required>
        <PasswordInput name="password" autoComplete="new-password" error={e.password} />
      </Field>
      <Field label="Confirmar contraseña" name="confirmPassword" error={e.confirmPassword} required>
        <PasswordInput name="confirmPassword" autoComplete="new-password" error={e.confirmPassword} />
      </Field>
      <div>
        <Checkbox
          name="acceptTerms"
          label={
            <>
              Acepto los{" "}
              <Link href="/terminos-y-condiciones" target="_blank" className="text-white underline decoration-acma">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/politica-de-privacidad" target="_blank" className="text-white underline decoration-acma">
                política de privacidad
              </Link>
              .
            </>
          }
        />
        {e.acceptTerms && <p className="mt-1 text-xs text-acma">{e.acceptTerms}</p>}
      </div>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, onSubmit, pending] = useFormAction(requestPasswordResetAction, {});
  const e = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <Field label="Correo electrónico" name="email" error={e.email} required>
        <Input name="email" type="email" autoComplete="email" error={e.email} required />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, onSubmit, pending] = useFormAction(resetPasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nueva contraseña" name="password" error={e.password} hint="Mínimo 8 caracteres, con letras y números." required>
        <PasswordInput name="password" autoComplete="new-password" error={e.password} />
      </Field>
      <Field label="Confirmar contraseña" name="confirmPassword" error={e.confirmPassword} required>
        <PasswordInput name="confirmPassword" autoComplete="new-password" error={e.confirmPassword} />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
