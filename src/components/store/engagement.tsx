import { Headphones, MessageCircle } from "lucide-react";
import { COLOR_ICONS, SocialIcon, socialLinks } from "@/components/brand/social-icons";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import type { PublicSettings } from "@/lib/settings";
import { WhatsAppGlyph, WhatsAppLink } from "./whatsapp";

/** Franja de asesoría por WhatsApp (solo si la tienda tiene número configurado). */
export function WhatsAppBand({ whatsapp }: { whatsapp: string | null }) {
  if (!whatsapp) return null;
  return (
    <section aria-labelledby="asesoria-title" className="py-10">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-acma/40 bg-gradient-to-r from-acma-dark via-acma to-acma-dark p-6 sm:p-10">
          <div className="absolute -right-10 top-0 h-full w-40 skew-x-[-20deg] bg-white/10" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15">
                <Headphones className="size-7" />
              </span>
              <div>
                <h2 id="asesoria-title" className="font-display text-3xl font-extrabold uppercase italic leading-none sm:text-4xl">
                  ¿No sabes cuál elegir?
                </h2>
                <p className="mt-2 max-w-xl text-white/90">
                  Te asesoramos por WhatsApp: disponibilidad, recomendaciones y separación de productos.
                </p>
              </div>
            </div>
            <WhatsAppLink intent="asesoria" className={buttonClass("white", "lg", "shrink-0")}>
              <WhatsAppGlyph className="size-5 text-acma" /> Escríbenos ahora
            </WhatsAppLink>
          </div>
        </div>
      </Container>
    </section>
  );
}

const SOCIAL_COPY: Record<string, string> = {
  instagram: "Novedades, historias y ofertas",
  facebook: "Promociones y catálogo",
  tiktok: "Videos de nuestros productos",
  youtube: "Reseñas y tutoriales",
  x: "Noticias de la tienda",
  whatsapp: "Asesoría y pedidos",
};

/** Canales de Facebook, Instagram y demás redes configuradas. */
export function SocialFollow({ settings }: { settings: PublicSettings }) {
  const links = socialLinks(settings);
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="redes-title" className="py-14">
      <Container>
        <div className="mb-8 text-center">
          <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-acma">
            <MessageCircle className="size-4" /> Comunidad ACMA
          </p>
          <h2 id="redes-title" className="font-display text-3xl font-bold uppercase sm:text-4xl">
            Síguenos en nuestras redes
          </h2>
          <p className="mt-2 text-silver">Entérate primero de los productos nuevos y las ofertas.</p>
        </div>
        <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <li key={l.name}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-line bg-carbon p-4 transition-all hover:-translate-y-0.5 hover:border-acma"
              >
                {COLOR_ICONS.has(l.name) ? (
                  <SocialIcon name={l.name} className="size-12 drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-acma text-white transition-transform group-hover:scale-110">
                    <SocialIcon name={l.name} className="size-6" />
                  </span>
                )}
                <span>
                  <span className="block font-bold text-white">{l.label}</span>
                  <span className="block text-sm text-silver">{SOCIAL_COPY[l.name]}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
