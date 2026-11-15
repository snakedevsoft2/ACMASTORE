import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandEmblem, Logo } from "@/components/brand/logo";
import { SocialIcon, socialLinks } from "@/components/brand/social-icons";
import { Container } from "@/components/ui/misc";
import type { PublicSettings } from "@/lib/settings";

const columns = [
  {
    title: "ACMA STORE",
    links: [
      { href: "/nosotros", label: "Nosotros" },
      { href: "/tienda", label: "Tienda" },
      { href: "/contacto", label: "Contacto" },
      { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
    ],
  },
  {
    title: "Mi compra",
    links: [
      { href: "/cuenta", label: "Mi cuenta" },
      { href: "/cuenta/pedidos", label: "Mis pedidos" },
      { href: "/seguimiento", label: "Seguimiento de pedido" },
      { href: "/carrito", label: "Carrito" },
    ],
  },
  {
    title: "Políticas",
    links: [
      { href: "/politica-de-privacidad", label: "Política de privacidad" },
      { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
      { href: "/politica-de-envios", label: "Política de envíos" },
      { href: "/politica-de-devoluciones", label: "Política de devoluciones" },
    ],
  },
];

/** Versión sencilla para la tienda que vende por WhatsApp. */
const simpleColumns = [
  {
    title: "ACMA STORE",
    links: [
      { href: "/tienda", label: "Tienda" },
      { href: "/tienda?ofertas=1", label: "Ofertas" },
      { href: "/nosotros", label: "Nosotros" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
      { href: "/politica-de-envios", label: "Política de envíos" },
      { href: "/politica-de-devoluciones", label: "Política de devoluciones" },
      { href: "/politica-de-privacidad", label: "Política de privacidad" },
      { href: "/terminos-y-condiciones", label: "Términos y condiciones" },
    ],
  },
];

export function Footer({ settings }: { settings: PublicSettings }) {
  const socials = socialLinks(settings);
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-ink">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-acma to-transparent" aria-hidden />
      <Container className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {settings.logoUrl ? (
            <Logo logoUrl={settings.logoUrl} storeName={settings.storeName} />
          ) : (
            <BrandEmblem alt={settings.storeName} className="size-32 shadow-[0_0_40px_-10px_rgba(229,9,20,0.6)]" />
          )}
          <p className="mt-4 font-display text-lg font-bold uppercase tracking-wide">
            {settings.storeName} <span className="text-acma">–</span> {settings.slogan}
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-silver">
            {settings.contactPhone && (
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-acma" />
                <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="hover:text-white">
                  {settings.contactPhone}
                </a>
              </li>
            )}
            {settings.contactEmail && (
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-acma" />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-white">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-acma" />
                <span>{settings.address}</span>
              </li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white">Redes sociales</p>
              <div className="flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-10 place-items-center rounded-lg border border-line text-silver transition-all hover:-translate-y-0.5 hover:border-acma hover:bg-acma hover:text-white"
                  >
                    <SocialIcon name={s.name} className="size-7" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {(settings.whatsappOnly ? simpleColumns : columns).map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-silver transition-colors hover:text-acma">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-silver-dim sm:flex-row">
          <p>
            © {year} {settings.storeName}. Todos los derechos reservados.
          </p>
          <p className="uppercase tracking-[0.2em]">
            Compra fácil · Recibe rápido · Confianza y calidad
          </p>
        </Container>
      </div>
    </footer>
  );
}
