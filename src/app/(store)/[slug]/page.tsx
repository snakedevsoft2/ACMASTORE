import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SocialIcon, socialLinks, whatsappLink } from "@/components/brand/social-icons";
import { RichText } from "@/components/rich-text";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Container } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { getSettings, toPublicSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

const getPage = cache((slug: string) => db.page.findFirst({ where: { slug, isPublished: true } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage((await params).slug);
  if (!page) return { title: "Página no encontrada" };
  return {
    title: page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: `/${page.slug}` },
    // Las páginas aún sin redactar no se indexan.
    robots: page.isReviewed ? undefined : { index: false, follow: true },
  };
}

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const settings = slug === "contacto" ? toPublicSettings(await getSettings()) : null;

  return (
    <>
      <div className="relative overflow-hidden border-b border-line bg-carbon/40">
        <div className="absolute -right-16 top-0 h-full w-32 skew-x-[-20deg] bg-acma/15" aria-hidden />
        <Container className="relative py-10">
          <Breadcrumbs items={[{ name: "Inicio", path: "/" }, { name: page.title, path: `/${page.slug}` }]} />
          <h1 className="font-display text-4xl font-extrabold uppercase italic sm:text-5xl">{page.title}</h1>
        </Container>
      </div>
      <Container className={`grid gap-10 py-12 ${settings ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <article className="max-w-3xl">
          <RichText content={page.content} />
          <p className="mt-10 text-xs text-silver-dim">Última actualización: {page.updatedAt.toLocaleDateString("es")}</p>
        </article>
        {settings && <ContactCard s={settings} />}
      </Container>
    </>
  );
}

function ContactCard({ s }: { s: ReturnType<typeof toPublicSettings> }) {
  const socials = socialLinks(s);
  const items = [
    s.contactPhone && { icon: Phone, label: "Teléfono", value: s.contactPhone, href: `tel:${s.contactPhone.replace(/\s/g, "")}` },
    s.contactEmail && { icon: Mail, label: "Correo", value: s.contactEmail, href: `mailto:${s.contactEmail}` },
    s.address && { icon: MapPin, label: "Dirección", value: s.address },
    s.businessHours && { icon: Clock, label: "Horario", value: s.businessHours },
  ].filter(Boolean) as Array<{ icon: typeof Phone; label: string; value: string; href?: string }>;

  return (
    <aside className="h-fit space-y-5 rounded-xl border border-line bg-carbon p-6">
      <h2 className="font-display text-xl font-bold uppercase">Datos de contacto</h2>
      {items.length === 0 && socials.length === 0 && <p className="text-sm text-silver">Los datos de contacto se publicarán próximamente.</p>}
      <ul className="space-y-4">
        {items.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-acma" />
            <div className="text-sm">
              <p className="text-silver-dim">{label}</p>
              {href ? (
                <a href={href} className="text-white hover:text-acma">
                  {value}
                </a>
              ) : (
                <p className="whitespace-pre-line text-white">{value}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {s.whatsapp && (
        <a
          href={whatsappLink(s.whatsapp, "Hola ACMA STORE, quiero hacer una consulta.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-acma font-semibold text-white transition-colors hover:bg-acma-dark"
        >
          <SocialIcon name="whatsapp" /> Escríbenos por WhatsApp
        </a>
      )}
      {socials.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {socials.map((so) => (
            <a key={so.name} href={so.url} target="_blank" rel="noopener noreferrer" aria-label={so.label} className="grid size-10 place-items-center rounded-lg border border-line text-silver hover:border-acma hover:text-white">
              <SocialIcon name={so.name} />
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
