"use client";

import Image from "next/image";
import type { PaymentMethodConfig, ShippingMethod, StoreSettings } from "@prisma/client";
import { Checkbox, Field, FormMessage, Input, SubmitButton, Textarea, useFormAction } from "@/components/ui/form";
import { centsToInput } from "@/lib/money";
import { saveSettingsAction, savePaymentMethodAction, saveShippingMethodAction } from "./actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-carbon p-5">
      <legend className="px-2 font-display text-lg font-bold uppercase">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function StoreSettingsForm({ s, feedUrl }: { s: StoreSettings; feedUrl: string }) {
  const [state, onSubmit, pending] = useFormAction(saveSettingsAction);
  const e = state.fieldErrors ?? {};
  const v = (x: string | null) => x ?? "";
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormMessage state={state} />
      <Section title="Información de la tienda">
        <Field label="Nombre de la tienda" name="storeName" error={e.storeName} required>
          <Input name="storeName" defaultValue={s.storeName} error={e.storeName} />
        </Field>
        <Field label="Eslogan" name="slogan" error={e.slogan} required>
          <Input name="slogan" defaultValue={s.slogan} error={e.slogan} />
        </Field>
        <Field label="Logotipo" name="logo" error={e.logo} hint="PNG o WebP con fondo transparente, ideal 360×96 px. Sin logotipo se usa el wordmark ACMA.">
          <input id="logo" type="file" name="logo" accept="image/png,image/webp,image/jpeg" className="block w-full text-sm text-silver file:mr-3 file:rounded-md file:border-0 file:bg-carbon-light file:px-3 file:py-2 file:text-white" />
        </Field>
        <div className="flex items-end gap-4 pb-1">
          {s.logoUrl && (
            <>
              <Image src={s.logoUrl} alt="Logotipo actual" width={140} height={40} className="h-10 w-auto rounded bg-ink p-1" />
              <Checkbox name="removeLogo" label="Quitar logotipo" />
            </>
          )}
        </div>
        <Field label="Barra de anuncio" name="announcement" error={e.announcement} hint="Texto corto sobre el encabezado (ej. una promoción vigente). Vacío = oculta." className="sm:col-span-2">
          <Input name="announcement" defaultValue={v(s.announcement)} maxLength={160} />
        </Field>
      </Section>

      <Section title="Contacto">
        <Field label="Correo de contacto" name="contactEmail" error={e.contactEmail} hint="También recibe avisos de pedidos nuevos si no se define ORDER_NOTIFICATION_EMAIL.">
          <Input name="contactEmail" type="email" defaultValue={v(s.contactEmail)} error={e.contactEmail} />
        </Field>
        <Field label="Teléfono" name="contactPhone" error={e.contactPhone}>
          <Input name="contactPhone" defaultValue={v(s.contactPhone)} />
        </Field>
        <Field label="WhatsApp de ventas" name="whatsapp" error={e.whatsapp} hint="Con indicativo de país, ej. +57 300 000 0000. Activa los botones “Separar por WhatsApp” y “Asesoría” en toda la tienda.">
          <Input name="whatsapp" defaultValue={v(s.whatsapp)} error={e.whatsapp} />
        </Field>
        <Field label="Horario de atención" name="businessHours" error={e.businessHours}>
          <Input name="businessHours" defaultValue={v(s.businessHours)} placeholder="Lun a Sáb, 8:00 a 18:00" />
        </Field>
        <Field label="Dirección" name="address" error={e.address} className="sm:col-span-2">
          <Input name="address" defaultValue={v(s.address)} />
        </Field>
      </Section>

      <Section title="Redes sociales">
        {(
          [
            ["instagramUrl", "Instagram"],
            ["facebookUrl", "Facebook"],
            ["tiktokUrl", "TikTok"],
            ["xUrl", "X (Twitter)"],
            ["youtubeUrl", "YouTube"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} name={key} error={e[key]}>
            <Input name={key} type="url" defaultValue={v(s[key])} placeholder="https://" error={e[key]} />
          </Field>
        ))}
      </Section>

      <Section title="Regional e inventario">
        <Field label="Moneda (ISO)" name="currency" error={e.currency} hint="Cambiarla no convierte precios existentes.">
          <Input name="currency" defaultValue={s.currency} maxLength={3} error={e.currency} />
        </Field>
        <Field label="Idioma y región" name="locale" error={e.locale} hint="Formato de números y fechas, ej. es-CO">
          <Input name="locale" defaultValue={s.locale} error={e.locale} />
        </Field>
        <Field label="País por defecto en direcciones" name="country" error={e.country}>
          <Input name="country" defaultValue={s.country} />
        </Field>
        <Field label="Umbral de inventario bajo" name="lowStockThreshold" error={e.lowStockThreshold} hint="Alertas en el dashboard cuando el stock es igual o menor.">
          <Input name="lowStockThreshold" type="number" min={0} defaultValue={s.lowStockThreshold} />
        </Field>
      </Section>

      <Section title="Google Analytics y Google Ads">
        <Field label="ID de medición GA4" name="gaMeasurementId" error={e.gaMeasurementId} hint="G-XXXXXXXXXX">
          <Input name="gaMeasurementId" defaultValue={v(s.gaMeasurementId)} error={e.gaMeasurementId} />
        </Field>
        <Field label="ID de Google Ads" name="googleAdsId" error={e.googleAdsId} hint="AW-XXXXXXXXX">
          <Input name="googleAdsId" defaultValue={v(s.googleAdsId)} error={e.googleAdsId} />
        </Field>
        <Field label="Etiqueta de conversión de compra (Ads)" name="googleAdsPurchaseLabel" error={e.googleAdsPurchaseLabel} className="sm:col-span-2" hint="Se envía al confirmar una compra. Eventos GA4 incluidos: view_item, add_to_cart, begin_checkout, add_shipping_info, add_payment_info, purchase.">
          <Input name="googleAdsPurchaseLabel" defaultValue={v(s.googleAdsPurchaseLabel)} />
        </Field>
      </Section>

      <Section title="Publicidad en Facebook e Instagram (Meta)">
        <Field label="ID del Meta Pixel" name="metaPixelId" error={e.metaPixelId} hint="Administrador de eventos de Meta → Orígenes de datos. Mide visitas, carrito, compras y contactos por WhatsApp.">
          <Input name="metaPixelId" inputMode="numeric" defaultValue={v(s.metaPixelId)} error={e.metaPixelId} />
        </Field>
        <Field label="Verificación de dominio de Meta" name="facebookDomainVerification" error={e.facebookDomainVerification} hint="Business Manager → Seguridad de la marca → Dominios. Pega el código o la etiqueta meta completa.">
          <Input name="facebookDomainVerification" defaultValue={v(s.facebookDomainVerification)} error={e.facebookDomainVerification} />
        </Field>
      </Section>

      <Section title="SEO y catálogo para anuncios">
        <Field label="Título para Google" name="seoTitle" error={e.seoTitle} hint="Máx. 70 caracteres. Vacío = se genera automáticamente." className="sm:col-span-2">
          <Input name="seoTitle" defaultValue={v(s.seoTitle)} maxLength={70} placeholder={`${s.storeName} — ${s.slogan}`} />
        </Field>
        <Field label="Descripción para Google" name="seoDescription" error={e.seoDescription} hint="Máx. 170 caracteres. Vacío = se genera con tus categorías." className="sm:col-span-2">
          <Textarea name="seoDescription" rows={2} defaultValue={v(s.seoDescription)} maxLength={170} />
        </Field>
        <Field label="Verificación de Google (Search Console / Merchant Center)" name="googleSiteVerification" error={e.googleSiteVerification} hint="Método “etiqueta HTML”. Pega el código o la etiqueta meta completa." className="sm:col-span-2">
          <Input name="googleSiteVerification" defaultValue={v(s.googleSiteVerification)} error={e.googleSiteVerification} />
        </Field>
        <div className="rounded-lg border border-line bg-ink-soft p-3 text-sm sm:col-span-2">
          <p className="font-semibold text-white">Feed de productos para anuncios</p>
          <p className="mt-1 text-silver">Úsalo en Google Merchant Center (Shopping) y en Meta Commerce Manager (catálogo de Facebook e Instagram). Se actualiza solo con tus productos:</p>
          <code className="mt-2 block break-all rounded bg-ink px-2 py-1.5 text-acma">{feedUrl}</code>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-line bg-ink-soft/95 px-1 py-3 backdrop-blur">
        <SubmitButton pending={pending}>Guardar configuración</SubmitButton>
      </div>
    </form>
  );
}

export function PaymentMethodForm({ m, configured, requirements }: { m: PaymentMethodConfig; configured: boolean; requirements: string[] }) {
  const [state, onSubmit, pending] = useFormAction(savePaymentMethodAction);
  const e = state.fieldErrors ?? {};
  const manual = m.provider === "BANK_TRANSFER" || m.provider === "CASH_ON_DELIVERY";
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="provider" value={m.provider} />
      {!configured && (
        <p className="rounded-lg border border-acma/40 bg-acma/10 p-3 text-sm">
          Credenciales no configuradas. Define en el servidor: <code className="text-white">{requirements.join(", ")}</code>. Mientras tanto este método no se ofrece a los clientes.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Nombre visible" name="displayName" error={e.displayName}>
          <Input name="displayName" defaultValue={m.displayName} error={e.displayName} />
        </Field>
        <Field label="Orden" name="sortOrder">
          <Input name="sortOrder" type="number" min={0} defaultValue={m.sortOrder} />
        </Field>
      </div>
      <Field label="Descripción en el checkout" name="description" error={e.description}>
        <Input name="description" defaultValue={m.description ?? ""} />
      </Field>
      {manual && (
        <Field
          label={m.provider === "BANK_TRANSFER" ? "Datos bancarios e instrucciones" : "Instrucciones para el cliente"}
          name="instructions"
          error={e.instructions}
          hint="Se muestran en la confirmación del pedido. Admite el mismo formato que las descripciones."
        >
          <Textarea name="instructions" rows={5} defaultValue={m.instructions ?? ""} />
        </Field>
      )}
      <Checkbox name="isActive" defaultChecked={m.isActive} label="Ofrecer este método a los clientes" disabled={!configured && !m.isActive} />
      <SubmitButton pending={pending} size="sm">
        Guardar
      </SubmitButton>
    </form>
  );
}

export function ShippingMethodForm({ m }: { m?: ShippingMethod }) {
  const [state, onSubmit, pending] = useFormAction(saveShippingMethodAction);
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" key={!m && state.ok ? state.message : m?.id ?? "new"}>
      <FormMessage state={state} />
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="name" error={e.name} required>
          <Input name="name" defaultValue={m?.name} placeholder="Ej.: Envío estándar" error={e.name} />
        </Field>
        <Field label="Tiempo estimado" name="estimatedDays" error={e.estimatedDays}>
          <Input name="estimatedDays" defaultValue={m?.estimatedDays ?? ""} placeholder="Ej.: 2 a 4 días hábiles" />
        </Field>
        <Field label="Costo" name="price" error={e.price} required hint="0 = gratis">
          <Input name="price" inputMode="decimal" defaultValue={m ? centsToInput(m.priceCents) : ""} error={e.price} />
        </Field>
        <Field label="Gratis desde (subtotal)" name="freeOver" error={e.freeOver} hint="Opcional">
          <Input name="freeOver" inputMode="decimal" defaultValue={m ? centsToInput(m.freeOverCents) : ""} error={e.freeOver} />
        </Field>
        <Field label="Descripción" name="description" error={e.description} className="sm:col-span-2">
          <Input name="description" defaultValue={m?.description ?? ""} placeholder="Ej.: Cobertura nacional" />
        </Field>
        <Field label="Orden" name="sortOrder">
          <Input name="sortOrder" type="number" min={0} defaultValue={m?.sortOrder ?? 0} />
        </Field>
        <div className="flex items-end pb-3">
          <Checkbox name="isActive" defaultChecked={m?.isActive ?? true} label="Disponible en el checkout" />
        </div>
      </div>
      <SubmitButton pending={pending} size="sm">
        {m ? "Guardar" : "Agregar método"}
      </SubmitButton>
    </form>
  );
}
