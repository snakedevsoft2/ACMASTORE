"use client";

import type { Role, Testimonial } from "@prisma/client";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import { promoteByEmailAction, savePageAction, saveTestimonialAction, setUserRoleAction } from "./contenido-actions";

export function PageForm({ page }: { page: { id: string; title: string; content: string; seoDescription: string | null; isPublished: boolean } }) {
  const [state, onSubmit, pending] = useFormAction(savePageAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={page.id} />
      <Field label="Título" name="title" error={e.title}>
        <Input name="title" defaultValue={page.title} error={e.title} />
      </Field>
      <Field
        label="Contenido"
        name="content"
        error={e.content}
        hint="Línea en blanco entre párrafos · “## ” título · “### ” subtítulo · “- ” lista · **negrita**"
      >
        <Textarea name="content" rows={22} defaultValue={page.content} className="font-mono text-[13px] leading-relaxed" />
      </Field>
      <Field label="Meta descripción (SEO)" name="seoDescription" error={e.seoDescription}>
        <Input name="seoDescription" defaultValue={page.seoDescription ?? ""} maxLength={170} />
      </Field>
      <Checkbox name="isPublished" defaultChecked={page.isPublished} label="Publicada" />
      <SubmitButton pending={pending}>Guardar página</SubmitButton>
    </form>
  );
}

export function TestimonialForm({ t }: { t?: Testimonial }) {
  const [state, onSubmit, pending] = useFormAction(saveTestimonialAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" key={!t && state.ok ? state.message : t?.id ?? "new"}>
      <FormMessage state={state} />
      {t && <input type="hidden" name="id" value={t.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del cliente" name="author" error={e.author} required>
          <Input name="author" defaultValue={t?.author} error={e.author} />
        </Field>
        <Field label="Ciudad (opcional)" name="location" error={e.location}>
          <Input name="location" defaultValue={t?.location ?? ""} />
        </Field>
      </div>
      <Field label="Testimonio" name="content" error={e.content} required>
        <Textarea name="content" rows={4} defaultValue={t?.content} maxLength={600} error={e.content} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Calificación" name="rating">
          <Select name="rating" defaultValue={String(t?.rating ?? 5)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Orden" name="sortOrder">
          <Input name="sortOrder" type="number" min={0} defaultValue={t?.sortOrder ?? 0} />
        </Field>
      </div>
      <Checkbox name="isActive" defaultChecked={t?.isActive ?? true} label="Mostrar en la página de inicio" />
      <div>
        <Checkbox name="confirmReal" label="Confirmo que es la opinión real de un cliente y cuento con su autorización para publicarla." />
        {e.confirmReal && <p className="mt-1 text-xs text-acma">{e.confirmReal}</p>}
      </div>
      <SubmitButton pending={pending} size="sm">
        {t ? "Guardar" : "Agregar testimonio"}
      </SubmitButton>
    </form>
  );
}

export function UserRoleForm({ userId, role, isActive, self }: { userId: string; role: Role; isActive: boolean; self: boolean }) {
  const [state, onSubmit, pending] = useFormAction(setUserRoleAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={role} disabled={self} aria-label="Rol" className="h-9 rounded-md border border-line bg-ink-soft px-2 text-sm">
        <option value="ADMIN">Administrador</option>
        <option value="STAFF">Operador</option>
        <option value="CUSTOMER">Cliente (quitar acceso)</option>
      </select>
      {self && <input type="hidden" name="role" value={role} />}
      <label className="flex items-center gap-1.5 text-xs text-silver">
        <input type="checkbox" name="isActive" defaultChecked={isActive} disabled={self} className="accent-[#E50914]" /> Activo
      </label>
      {self && <input type="hidden" name="isActive" value="on" />}
      <SubmitButton pending={pending} size="sm" variant="secondary" disabled={self}>
        Guardar
      </SubmitButton>
      {state.error && <span className="w-full text-right text-xs text-acma">{state.error}</span>}
      {state.ok && <span className="w-full text-right text-xs text-silver">{state.message}</span>}
    </form>
  );
}

export function PromoteForm() {
  const [state, onSubmit, pending] = useFormAction(promoteByEmailAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <Field label="Correo de una cuenta existente" name="email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Rol" name="role">
        <Select name="role" defaultValue="STAFF">
          <option value="STAFF">Operador: productos, inventario, pedidos y clientes</option>
          <option value="ADMIN">Administrador: acceso total</option>
        </Select>
      </Field>
      <SubmitButton pending={pending} size="sm">
        Dar acceso
      </SubmitButton>
    </form>
  );
}
