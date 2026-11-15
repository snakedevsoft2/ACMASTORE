import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CreditCard, Headphones, PackageCheck, Quote, ShieldCheck, Star, Truck } from "lucide-react";
import type { Testimonial } from "@prisma/client";
import { Container, SectionHeading } from "@/components/ui/misc";
import type { ProductCardData } from "@/lib/catalog";
import type { MoneyFormat } from "@/lib/money";
import { ProductGrid } from "./product-card";

export function ProductSection({
  id,
  eyebrow,
  title,
  description,
  products,
  money,
  href,
  priorityCount,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  products: ProductCardData[];
  money: MoneyFormat;
  href: string;
  priorityCount?: number;
}) {
  if (products.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="py-14 sm:py-16">
      <Container>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-acma">
              Ver todo <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          }
        />
        <ProductGrid products={products} money={money} priorityCount={priorityCount} />
      </Container>
    </section>
  );
}

type Cat = { id: string; name: string; slug: string; imageUrl: string | null; description: string | null; _count: { products: number } };

export function CategoryGrid({ categories }: { categories: Cat[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="categorias-title" className="py-14 sm:py-16">
      <Container>
        <SectionHeading eyebrow="Explora" title="Categorías" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/tienda/${c.slug}`}
              className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-line bg-carbon p-4 transition-all duration-300 hover:border-acma/60"
            >
              {c.imageUrl ? (
                <Image src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="-z-10 object-cover opacity-60 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80" />
              ) : (
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#1a1a1a_0%,#050505_60%)]" aria-hidden>
                  <div className="absolute -right-6 top-0 h-full w-10 skew-x-[-20deg] bg-acma/30 transition-all group-hover:w-16 group-hover:bg-acma/60" />
                </div>
              )}
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden />
              <h3 className="font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{c.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-silver">
                {c._count.products} {c._count.products === 1 ? "producto" : "productos"}
                <ArrowRight className="size-3.5 text-acma transition-transform group-hover:translate-x-1" />
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

const benefits = [
  { icon: Truck, title: "Envío a domicilio", text: "Elige el método de envío que mejor se adapte a ti." },
  { icon: CreditCard, title: "Pagos seguros", text: "Pasarelas certificadas. Nunca guardamos tu tarjeta." },
  { icon: PackageCheck, title: "Seguimiento", text: "Consulta el estado de tu pedido en todo momento." },
  { icon: ShieldCheck, title: "Compra protegida", text: "Políticas claras de envíos y devoluciones." },
  { icon: Headphones, title: "Atención cercana", text: "Te acompañamos antes, durante y después de tu compra." },
];

export function Benefits() {
  return (
    <section aria-labelledby="beneficios-title" className="relative overflow-hidden border-y border-line bg-carbon/40 py-14 sm:py-16">
      <div className="absolute -left-20 top-0 h-full w-40 skew-x-[-20deg] bg-acma/10" aria-hidden />
      <Container className="relative">
        <SectionHeading eyebrow="¿Por qué ACMA?" title="Beneficios de comprar con nosotros" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-line bg-ink p-5 transition-colors hover:border-acma/50">
              <Icon className="size-7 text-acma" />
              <h3 className="mt-4 font-display text-lg font-bold uppercase">{title}</h3>
              <p className="mt-1 text-sm text-silver">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="testimonios-title" className="py-14 sm:py-16">
      <Container>
        <SectionHeading eyebrow="Clientes" title="Lo que dicen de nosotros" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="relative rounded-xl border border-line bg-carbon p-6">
              <Quote className="absolute right-5 top-5 size-8 text-acma/30" aria-hidden />
              <div className="flex gap-0.5" aria-label={`${t.rating} de 5 estrellas`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-4 ${i < t.rating ? "fill-acma text-acma" : "text-line-strong"}`} aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 text-silver">“{t.content}”</blockquote>
              <figcaption className="mt-5 border-t border-line pt-4">
                <span className="font-semibold text-white">{t.author}</span>
                {t.location && <span className="text-sm text-silver-dim"> · {t.location}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
