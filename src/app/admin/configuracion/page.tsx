import { Mail } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import { StoreSettingsForm } from "./settings-forms";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requirePermission("settings:manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Configuración de la tienda" description="Identidad, contacto, WhatsApp, redes sociales, región, analítica, publicidad y SEO." />
      {!isEmailConfigured() && (
        <p className="mb-6 flex items-start gap-2 rounded-lg border border-acma/40 bg-acma/10 p-3 text-sm">
          <Mail className="mt-0.5 size-4 shrink-0 text-acma" />
          El correo SMTP no está configurado: no se están enviando confirmaciones de pedido ni enlaces de recuperación de contraseña. Define SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM en las variables de entorno del servidor.
        </p>
      )}
      <StoreSettingsForm s={s} feedUrl={siteUrl("/feeds/productos.xml")} />
    </>
  );
}
