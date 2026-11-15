"use client";

import { changePasswordAction, saveAddressAction, updateProfileAction } from "@/app/actions/auth";
import { Checkbox, Field, FormMessage, Input, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import type { ActionState } from "@/lib/validation";

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [state, onSubmit, pending] = useFormAction(updateProfileAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage state={state} />
      <Field label="Correo electrónico" name="email-ro" hint="Para cambiar tu correo, contáctanos.">
        <Input name="email-ro" value={email} disabled readOnly />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" name="name" error={e.name} required>
          <Input name="name" defaultValue={name} autoComplete="name" error={e.name} />
        </Field>
        <Field label="Teléfono" name="phone" error={e.phone}>
          <Input name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" error={e.phone} />
        </Field>
      </div>
      <SubmitButton pending={pending}>Guardar cambios</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, onSubmit, pending] = useFormAction(changePasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form
      onSubmit={(ev) => {
        onSubmit(ev);
      }}
      noValidate
      className="space-y-4"
      key={state.ok ? "done" : "form"}
    >
      <FormMessage state={state} />
      <Field label="Contraseña actual" name="currentPassword" error={e.currentPassword} required>
        <Input name="currentPassword" type="password" autoComplete="current-password" error={e.currentPassword} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" name="password" error={e.password} required hint="Mínimo 8 caracteres, con letras y números.">
          <Input name="password" type="password" autoComplete="new-password" error={e.password} />
        </Field>
        <Field label="Confirmar contraseña" name="confirmPassword" error={e.confirmPassword} required>
          <Input name="confirmPassword" type="password" autoComplete="new-password" error={e.confirmPassword} />
        </Field>
      </div>
      <SubmitButton pending={pending}>Cambiar contraseña</SubmitButton>
    </form>
  );
}

export type AddressValues = {
  id?: string;
  label?: string | null;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string | null;
  country?: string;
  notes?: string | null;
  isDefault?: boolean;
};

export function AddressForm({ values }: { values: AddressValues }) {
  const [state, onSubmit, pending] = useFormAction(saveAddressAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage state={state} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la dirección" name="label" error={e.label} hint="Ej.: Casa, Oficina">
          <Input name="label" defaultValue={values.label ?? ""} />
        </Field>
        <Field label="Nombre de quien recibe" name="fullName" error={e.fullName} required>
          <Input name="fullName" defaultValue={values.fullName ?? ""} autoComplete="name" error={e.fullName} />
        </Field>
        <Field label="Teléfono" name="phone" error={e.phone} required>
          <Input name="phone" type="tel" defaultValue={values.phone ?? ""} autoComplete="tel" error={e.phone} />
        </Field>
        <Field label="País" name="country" error={e.country} required>
          <Input name="country" defaultValue={values.country ?? ""} autoComplete="country-name" error={e.country} />
        </Field>
        <Field label="Dirección" name="line1" error={e.line1} required className="sm:col-span-2">
          <Input name="line1" defaultValue={values.line1 ?? ""} autoComplete="address-line1" error={e.line1} />
        </Field>
        <Field label="Complemento" name="line2" error={e.line2} className="sm:col-span-2">
          <Input name="line2" defaultValue={values.line2 ?? ""} autoComplete="address-line2" />
        </Field>
        <Field label="Ciudad" name="city" error={e.city} required>
          <Input name="city" defaultValue={values.city ?? ""} autoComplete="address-level2" error={e.city} />
        </Field>
        <Field label="Departamento / Estado" name="state" error={e.state} required>
          <Input name="state" defaultValue={values.state ?? ""} autoComplete="address-level1" error={e.state} />
        </Field>
        <Field label="Código postal" name="postalCode" error={e.postalCode}>
          <Input name="postalCode" defaultValue={values.postalCode ?? ""} autoComplete="postal-code" />
        </Field>
        <Field label="Indicaciones" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={2} defaultValue={values.notes ?? ""} />
        </Field>
      </div>
      <Checkbox name="isDefault" defaultChecked={values.isDefault} label="Usar como dirección principal" />
      <SubmitButton pending={pending}>Guardar dirección</SubmitButton>
    </form>
  );
}
