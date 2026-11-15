"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";
import {
  changeStatusAction,
  expireOrdersNowAction,
  markRefundedAction,
  registerPaymentAction,
  saveAdminNoteAction,
  saveShippingAction,
} from "./actions";

export function StatusForm({ orderId, allowed }: { orderId: string; allowed: OrderStatus[] }) {
  const [state, onSubmit, pending] = useFormAction(changeStatusAction);
  if (allowed.length === 0) return <p className="text-sm text-silver">Este pedido está en un estado final.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3" key={allowed.join(",")}>
      <FormMessage state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      <Field label="Nuevo estado" name="status">
        <Select name="status" defaultValue={allowed[0]}>
          {allowed.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nota (opcional)" name="note" hint="Cancelar devuelve automáticamente el stock al inventario.">
        <Input name="note" maxLength={500} />
      </Field>
      <SubmitButton pending={pending} size="sm">
        Actualizar estado
      </SubmitButton>
    </form>
  );
}

export function ShippingForm({
  orderId,
  carrier,
  trackingNumber,
  trackingUrl,
  canShip,
}: {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  canShip: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(saveShippingAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Transportadora" name="carrier">
          <Input name="carrier" defaultValue={carrier} maxLength={80} />
        </Field>
        <Field label="Número de guía" name="trackingNumber">
          <Input name="trackingNumber" defaultValue={trackingNumber} maxLength={80} />
        </Field>
      </div>
      <Field label="Enlace de rastreo" name="trackingUrl">
        <Input name="trackingUrl" type="url" defaultValue={trackingUrl} placeholder="https://" />
      </Field>
      {canShip && <Checkbox name="markShipped" defaultChecked label="Marcar el pedido como Enviado y avisar al cliente" />}
      <SubmitButton pending={pending} size="sm">
        Guardar envío
      </SubmitButton>
    </form>
  );
}

export function RegisterPaymentForm({ orderId, online }: { orderId: string; online: boolean }) {
  const [state, onSubmit, pending] = useFormAction(registerPaymentAction);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      {online && (
        <p className="rounded-md border border-acma/40 bg-acma/10 p-2 text-xs">
          Este pedido usa pago en línea: normalmente la pasarela lo confirma sola. Regístralo a mano solo si verificaste el pago en el panel de la pasarela.
        </p>
      )}
      <Field label="Referencia o comprobante" name="reference" hint="Ej.: número de transferencia, recibo de pago contra entrega.">
        <Input name="reference" maxLength={120} required />
      </Field>
      <SubmitButton pending={pending} size="sm">
        Registrar pago recibido
      </SubmitButton>
    </form>
  );
}

export function RefundForm({ orderId }: { orderId: string }) {
  const [state, onSubmit, pending] = useFormAction(markRefundedAction);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-xs text-silver">Registra aquí un reembolso que ya hiciste en la pasarela o por transferencia. Este sistema no mueve dinero.</p>
      <Field label="Detalle" name="note">
        <Input name="note" maxLength={300} />
      </Field>
      <SubmitButton pending={pending} size="sm" variant="danger">
        Registrar reembolso
      </SubmitButton>
    </form>
  );
}

export function AdminNoteForm({ orderId, note }: { orderId: string; note: string }) {
  const [state, onSubmit, pending] = useFormAction(saveAdminNoteAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <Textarea name="adminNote" defaultValue={note} rows={3} placeholder="Solo visible para el equipo" aria-label="Nota interna" />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} size="sm" variant="secondary">
          Guardar nota
        </SubmitButton>
        {state.ok && <span className="text-xs text-silver">Guardada</span>}
      </div>
    </form>
  );
}

export function ExpireButton() {
  const [state, action, pending] = useActionState<ActionState>(expireOrdersNowAction, {});
  return (
    <form action={action} className="flex items-center gap-3">
      {state.message && <span className="text-xs text-silver">{state.message}</span>}
      <Button variant="secondary" size="sm" disabled={pending} title="Cancela pedidos con pago en línea no completado dentro del plazo y libera su stock">
        Liberar pedidos vencidos
      </Button>
    </form>
  );
}
