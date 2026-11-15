"use client";

import Image from "next/image";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import { saveCategoryAction } from "./actions";

export type CategoryValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
};

export function CategoryForm({ values, parents }: { values: CategoryValues; parents: Array<{ id: string; name: string }> }) {
  const [state, onSubmit, pending] = useFormAction(saveCategoryAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage state={state} />
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Nombre" name="name" error={e.name} required>
        <Input name="name" defaultValue={values.name} error={e.name} />
      </Field>
      <Field label="Enlace (URL)" name="slug" error={e.slug} hint="Vacío = se genera desde el nombre">
        <Input name="slug" defaultValue={values.slug} error={e.slug} />
      </Field>
      <Field label="Categoría padre" name="parentId" error={e.parentId}>
        <Select name="parentId" defaultValue={values.parentId}>
          <option value="">Ninguna (categoría principal)</option>
          {parents
            .filter((p) => p.id !== values.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Descripción" name="description" error={e.description} hint="Se muestra en la página de la categoría y ayuda al SEO.">
        <Textarea name="description" rows={3} defaultValue={values.description} maxLength={500} />
      </Field>
      <Field label="Imagen" name="image" hint="Opcional. Se usa en la sección de categorías de la página de inicio.">
        <input type="file" id="image" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-silver file:mr-3 file:rounded-md file:border-0 file:bg-carbon-light file:px-3 file:py-2 file:text-white" />
      </Field>
      {values.imageUrl && (
        <div className="flex items-center gap-3">
          <Image src={values.imageUrl} alt="" width={64} height={48} className="h-12 w-16 rounded object-cover" />
          <Checkbox name="removeImage" label="Quitar imagen actual" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Orden" name="sortOrder" error={e.sortOrder}>
          <Input name="sortOrder" type="number" min={0} defaultValue={values.sortOrder} />
        </Field>
        <div className="flex items-end pb-3">
          <Checkbox name="isActive" defaultChecked={values.isActive} label="Visible en la tienda" />
        </div>
      </div>
      <SubmitButton pending={pending}>{values.id ? "Guardar cambios" : "Crear categoría"}</SubmitButton>
    </form>
  );
}
