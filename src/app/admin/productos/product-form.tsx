"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, Textarea, inputClass, useFormAction } from "@/components/ui/form";
import { parseMoneyToCents } from "@/lib/money";
import { cn, slugify } from "@/lib/utils";
import { saveProductAction } from "./actions";

type OptionRow = { name: string; valuesText: string };
type VariantRow = {
  key: string;
  id?: string;
  options: Record<string, string>;
  sku: string;
  price: string;
  compareAt: string;
  stock: string;
  isActive: boolean;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  price: string;
  compareAt: string;
  isFeatured: boolean;
  trackStock: boolean;
  seoTitle: string;
  seoDescription: string;
  options: Array<{ name: string; values: string[] }>;
  variants: Array<Omit<VariantRow, "key">>;
};

const comboKey = (opts: Record<string, string>, names: string[]) => names.map((n) => opts[n] ?? "").join("|");
let seq = 0;
const newKey = () => `v${++seq}`;

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-carbon">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-lg font-bold uppercase">{title}</h2>
        {description && <p className="text-xs text-silver">{description}</p>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function ProductForm({
  values,
  categories,
  currency,
}: {
  values: ProductFormValues;
  categories: Array<{ id: string; name: string; parentName: string | null }>;
  currency: string;
}) {
  const [state, onSubmit, pending] = useFormAction(saveProductAction);
  const e = state.fieldErrors ?? {};

  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [price, setPrice] = useState(values.price);
  const [compareAt, setCompareAt] = useState(values.compareAt);
  const [seoTitle, setSeoTitle] = useState(values.seoTitle);
  const [seoDescription, setSeoDescription] = useState(values.seoDescription);
  const [shortDescription, setShortDescription] = useState(values.shortDescription);

  const [hasVariants, setHasVariants] = useState(values.options.length > 0);
  const [trackStock, setTrackStock] = useState(values.trackStock);
  const [options, setOptions] = useState<OptionRow[]>(
    values.options.length ? values.options.map((o) => ({ name: o.name, valuesText: o.values.join(", ") })) : [{ name: "Talla", valuesText: "" }],
  );
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    values.variants.length
      ? values.variants.map((v) => ({ ...v, key: newKey() }))
      : [{ key: newKey(), options: {}, sku: "", price: "", compareAt: "", stock: "0", isActive: true }],
  );
  const [previews, setPreviews] = useState<string[]>([]);

  const parsedOptions = useMemo(
    () =>
      options
        .map((o) => ({ name: o.name.trim(), values: Array.from(new Set(o.valuesText.split(",").map((v) => v.trim()).filter(Boolean))) }))
        .filter((o) => o.name && o.values.length),
    [options],
  );

  const simpleVariant = variants.find((v) => Object.keys(v.options).length === 0) ?? variants[0];

  const generate = () => {
    const names = parsedOptions.map((o) => o.name);
    const combos = parsedOptions.reduce<Record<string, string>[]>(
      (acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v }))),
      [{}],
    );
    const existing = new Map(variants.map((v) => [comboKey(v.options, names), v]));
    setVariants(combos.map((c) => existing.get(comboKey(c, names)) ?? { key: newKey(), options: c, sku: "", price: "", compareAt: "", stock: "0", isActive: true }));
  };

  const updateVariant = (key: string, patch: Partial<VariantRow>) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const payloadVariants = hasVariants
    ? variants.filter((v) => Object.keys(v.options).length > 0)
    : [{ ...simpleVariant, options: {}, price: "", compareAt: "" }];
  const payloadOptions = hasVariants ? parsedOptions : [];

  const priceCents = parseMoneyToCents(price);
  const compareCents = parseMoneyToCents(compareAt);
  const pct = priceCents && compareCents && compareCents > priceCents ? Math.round(((compareCents - priceCents) / compareCents) * 100) : null;
  const totalStock = payloadVariants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6 pb-24">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="optionsJson" value={JSON.stringify(payloadOptions)} />
      <input type="hidden" name="trackStock" value={String(trackStock)} />
      <input
        type="hidden"
        name="variantsJson"
        value={JSON.stringify(payloadVariants.map(({ key: _k, stock, ...v }) => ({ ...v, stock: Number(stock) || 0 })))}
      />
      <FormMessage state={state} />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Información">
            <Field label="Nombre del producto" name="name" error={e.name} required>
              <Input name="name" value={name} onChange={(ev) => setName(ev.target.value)} error={e.name} maxLength={150} />
            </Field>
            <Field label="Enlace (URL)" name="slug" error={e.slug} hint={`/producto/${slugify(slug || name) || "…"}`}>
              <Input name="slug" value={slug} onChange={(ev) => setSlug(ev.target.value)} placeholder={slugify(name)} error={e.slug} />
            </Field>
            <Field label="Descripción corta" name="shortDescription" error={e.shortDescription} hint={`${shortDescription.length}/300 · aparece bajo el nombre`}>
              <Input name="shortDescription" value={shortDescription} onChange={(ev) => setShortDescription(ev.target.value)} maxLength={300} />
            </Field>
            <Field
              label="Descripción completa"
              name="description"
              error={e.description}
              hint="Formato: deja una línea en blanco entre párrafos, usa “## ” para títulos, “- ” para listas y **texto** para negrita."
            >
              <Textarea name="description" rows={9} defaultValue={values.description} />
            </Field>
          </Card>

          <Card title="Precio" description={`Valores en ${currency}. El precio anterior se muestra tachado como descuento.`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio de venta" name="price" error={e.price} required>
                <Input name="price" inputMode="decimal" value={price} onChange={(ev) => setPrice(ev.target.value)} placeholder="0" error={e.price} />
              </Field>
              <Field label="Precio anterior (opcional)" name="compareAt" error={e.compareAt} hint={pct ? `Descuento mostrado: ${pct}%` : "Déjalo vacío si no hay descuento"}>
                <Input name="compareAt" inputMode="decimal" value={compareAt} onChange={(ev) => setCompareAt(ev.target.value)} error={e.compareAt} />
              </Field>
            </div>
          </Card>

          <Card
            title="Variantes e inventario"
            description={trackStock ? `Stock total: ${totalStock} unidades` : "Sin control de inventario: el producto siempre aparece disponible."}
          >
            <Checkbox
              checked={trackStock}
              onChange={(ev) => setTrackStock(ev.target.checked)}
              label="Controlar inventario (descontar unidades con cada venta y avisar cuando se agote)"
            />
            <Checkbox
              checked={hasVariants}
              onChange={(ev) => setHasVariants(ev.target.checked)}
              label="Este producto tiene variantes (talla, color, modelo…)"
            />

            {!hasVariants ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU / Referencia" name="_sku">
                  <Input name="_sku" value={simpleVariant.sku} onChange={(ev) => updateVariant(simpleVariant.key, { sku: ev.target.value })} />
                </Field>
                {trackStock && (
                  <Field label="Unidades en inventario" name="_stock" hint="Los cambios quedan registrados en el historial de inventario.">
                    <Input name="_stock" type="number" min={0} value={simpleVariant.stock} onChange={(ev) => updateVariant(simpleVariant.key, { stock: ev.target.value })} />
                  </Field>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {options.map((o, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                      <input
                        aria-label="Nombre de la opción"
                        className={inputClass}
                        value={o.name}
                        placeholder="Ej.: Color"
                        onChange={(ev) => setOptions((os) => os.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))}
                      />
                      <input
                        aria-label="Valores separados por coma"
                        className={inputClass}
                        value={o.valuesText}
                        placeholder="Valores separados por coma: Rojo, Negro, Plata"
                        onChange={(ev) => setOptions((os) => os.map((x, j) => (j === i ? { ...x, valuesText: ev.target.value } : x)))}
                      />
                      <Button type="button" variant="ghost" onClick={() => setOptions((os) => os.filter((_, j) => j !== i))} disabled={options.length === 1} aria-label="Quitar opción">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    {options.length < 3 && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setOptions((os) => [...os, { name: "", valuesText: "" }])}>
                        <Plus className="size-4" /> Agregar opción
                      </Button>
                    )}
                    <Button type="button" size="sm" onClick={generate} disabled={parsedOptions.length === 0}>
                      <Wand2 className="size-4" /> Generar combinaciones
                    </Button>
                  </div>
                </div>

                {variants.some((v) => Object.keys(v.options).length > 0) ? (
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-ink-soft text-left text-xs uppercase tracking-wider text-silver">
                        <tr>
                          <th className="px-3 py-2">Variante</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Precio propio</th>
                          <th className="px-3 py-2">Precio anterior</th>
                          {trackStock && <th className="px-3 py-2">Stock</th>}
                          <th className="px-3 py-2">Activa</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {variants
                          .filter((v) => Object.keys(v.options).length > 0)
                          .map((v) => (
                            <tr key={v.key} className={cn("border-t border-line", !v.isActive && "opacity-50")}>
                              <td className="px-3 py-2 font-medium">{Object.values(v.options).join(" / ")}</td>
                              <td className="px-3 py-2">
                                <input aria-label="SKU" className={cn(inputClass, "h-9")} value={v.sku} onChange={(ev) => updateVariant(v.key, { sku: ev.target.value })} />
                              </td>
                              <td className="px-3 py-2">
                                <input aria-label="Precio propio" className={cn(inputClass, "h-9")} inputMode="decimal" placeholder={price || "Base"} value={v.price} onChange={(ev) => updateVariant(v.key, { price: ev.target.value })} />
                              </td>
                              <td className="px-3 py-2">
                                <input aria-label="Precio anterior" className={cn(inputClass, "h-9")} inputMode="decimal" value={v.compareAt} onChange={(ev) => updateVariant(v.key, { compareAt: ev.target.value })} />
                              </td>
                              {trackStock && (
                                <td className="px-3 py-2">
                                  <input aria-label="Stock" type="number" min={0} className={cn(inputClass, "h-9 w-24")} value={v.stock} onChange={(ev) => updateVariant(v.key, { stock: ev.target.value })} />
                                </td>
                              )}
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" aria-label="Variante activa" className="size-4 accent-[#E50914]" checked={v.isActive} onChange={(ev) => updateVariant(v.key, { isActive: ev.target.checked })} />
                              </td>
                              <td className="px-3 py-2">
                                <button type="button" className="p-1 text-silver hover:text-acma" aria-label="Quitar variante" onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}>
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-silver">
                    Define las opciones y pulsa <strong className="text-white">Generar combinaciones</strong> para crear las variantes.
                  </p>
                )}
                <p className="text-xs text-silver-dim">“Precio propio” vacío = usa el precio de venta del producto. Las variantes con ventas no se borran: se desactivan para conservar el historial.</p>
              </div>
            )}
          </Card>

          {!values.id && (
            <Card title="Fotografías" description="JPG, PNG o WebP hasta 8 MB. Se optimizan automáticamente. La primera será la principal.">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong p-8 text-sm text-silver transition-colors hover:border-acma hover:text-white">
                <ImagePlus className="size-8 text-acma" />
                Seleccionar fotos
                <input
                  type="file"
                  name="newImages"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  className="sr-only"
                  onChange={(ev) => setPreviews(Array.from(ev.target.files ?? []).map((f) => URL.createObjectURL(f)))}
                />
              </label>
              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt={`Vista previa ${i + 1}`} className="aspect-square rounded-md object-cover" />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Publicación">
            <Field label="Estado" name="status" error={e.status}>
              <Select name="status" defaultValue={values.status}>
                <option value="DRAFT">Borrador (no visible)</option>
                <option value="ACTIVE">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </Select>
            </Field>
            <Field label="Categoría" name="categoryId" error={e.categoryId}>
              <Select name="categoryId" defaultValue={values.categoryId}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentName ? `${c.parentName} › ${c.name}` : c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Checkbox name="isFeatured" defaultChecked={values.isFeatured} label="Mostrar en “Productos destacados”" />
          </Card>

          <Card title="SEO" description="Cómo aparece en Google y al compartir.">
            <Field label="Título SEO" name="seoTitle" error={e.seoTitle} hint={`${seoTitle.length}/70`}>
              <Input name="seoTitle" value={seoTitle} onChange={(ev) => setSeoTitle(ev.target.value)} placeholder={name} maxLength={70} />
            </Field>
            <Field label="Meta descripción" name="seoDescription" error={e.seoDescription} hint={`${seoDescription.length}/170`}>
              <Textarea name="seoDescription" rows={3} value={seoDescription} onChange={(ev) => setSeoDescription(ev.target.value)} placeholder={shortDescription} maxLength={170} />
            </Field>
            <div className="rounded-lg border border-line bg-ink-soft p-3">
              <p className="truncate text-xs text-silver-dim">/producto/{slugify(slug || name)}</p>
              <p className="truncate text-sm font-medium text-white">{seoTitle || name || "Título del producto"}</p>
              <p className="line-clamp-2 text-xs text-silver">{seoDescription || shortDescription || "Descripción del producto…"}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur lg:left-[250px]">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {state.error && <p className="mr-auto text-sm text-acma">{state.error}</p>}
          {state.ok && state.message && <p className="mr-auto text-sm text-silver">{state.message}</p>}
          <SubmitButton pending={pending} pendingText="Guardando…">
            {values.id ? "Guardar cambios" : "Crear producto"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
