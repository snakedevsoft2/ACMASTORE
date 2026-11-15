"use client";

import { useState } from "react";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, useFormAction } from "@/components/ui/form";
import { saveCouponAction } from "./actions";

export type CouponValues = {
  id?: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function CouponForm({ values, currency }: { values: CouponValues; currency: string }) {
  const [state, onSubmit, pending] = useFormAction(saveCouponAction);
  const [type, setType] = useState(values.type);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" key={!values.id && state.ok ? state.message : values.id ?? "new"}>
      <FormMessage state={state} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" name="code" error={e.code} required hint="El cliente lo escribe en el checkout.">
          <Input name="code" defaultValue={values.code} className="uppercase" error={e.code} />
        </Field>
        <Field label="Descripción interna" name="description" error={e.description}>
          <Input name="description" defaultValue={values.description} />
        </Field>
        <Field label="Tipo" name="type">
          <Select name="type" value={type} onChange={(ev) => setType(ev.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">Porcentaje</option>
            <option value="FIXED">Monto fijo ({currency})</option>
          </Select>
        </Field>
        <Field label={type === "PERCENT" ? "Porcentaje (%)" : `Monto (${currency})`} name="value" error={e.value} required>
          <Input name="value" inputMode="decimal" defaultValue={values.value} error={e.value} />
        </Field>
        <Field label="Compra mínima" name="minSubtotal" error={e.minSubtotal} hint="Opcional">
          <Input name="minSubtotal" inputMode="decimal" defaultValue={values.minSubtotal} error={e.minSubtotal} />
        </Field>
        <Field label="Usos máximos" name="maxUses" error={e.maxUses} hint="Opcional · total entre todos los clientes">
          <Input name="maxUses" type="number" min={1} defaultValue={values.maxUses} error={e.maxUses} />
        </Field>
        <Field label="Válido desde" name="startsAt" error={e.startsAt}>
          <Input name="startsAt" type="date" defaultValue={values.startsAt} />
        </Field>
        <Field label="Válido hasta" name="endsAt" error={e.endsAt}>
          <Input name="endsAt" type="date" defaultValue={values.endsAt} error={e.endsAt} />
        </Field>
      </div>
      <Checkbox name="isActive" defaultChecked={values.isActive} label="Cupón activo" />
      <SubmitButton pending={pending} size="sm">
        {values.id ? "Guardar" : "Crear cupón"}
      </SubmitButton>
    </form>
  );
}
