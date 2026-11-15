import { getImageProps } from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import banner from "@/assets/brand/acma-banner.webp";
import emblem from "@/assets/brand/acma-emblema.webp";

const ALT = "ACMA STORE — Todo en un solo lugar. Compra fácil, recibe rápido, confianza y calidad.";

/**
 * Portada con las piezas oficiales de la marca:
 * banner horizontal desde tablet y emblema circular en celular (el banner sería ilegible).
 */
export function Hero({ slogan, hasOffers, headingAs: Heading = "h1" }: { slogan: string; hasOffers: boolean; headingAs?: "h1" | "h2" }) {
  const {
    props: { srcSet: bannerSrcSet, sizes: bannerSizes },
  } = getImageProps({ src: banner, alt: ALT, sizes: "(min-width: 2056px) 2056px, 100vw", priority: Heading === "h1", quality: 90 });
  const {
    props: { srcSet: emblemSrcSet, ...imgProps },
  } = getImageProps({ src: emblem, alt: ALT, sizes: "(min-width: 448px) 448px, 100vw", priority: Heading === "h1", quality: 85 });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line bg-ink">
      <Heading id="hero-title" className="sr-only">
        ACMA STORE — {slogan}
      </Heading>
      <picture>
        <source media="(min-width: 768px)" srcSet={bannerSrcSet} sizes={bannerSizes} width={banner.width} height={banner.height} />
        <img
          {...imgProps}
          srcSet={emblemSrcSet}
          className="mx-auto block h-auto w-full max-w-md px-4 pt-4 md:max-w-[2056px] md:px-0 md:pt-0"
        />
      </picture>

      <div className="relative border-t border-line bg-carbon/60">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-acma to-transparent" aria-hidden />
        <Container className="flex flex-col items-center justify-between gap-4 py-5 sm:flex-row">
          <p className="text-center text-sm uppercase tracking-[0.2em] text-silver sm:text-left">
            Compra fácil <span className="text-acma">·</span> Recibe rápido <span className="text-acma">·</span> Confianza y calidad
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/tienda" size="lg">
              Ir a la tienda
            </ButtonLink>
            {hasOffers && (
              <ButtonLink href="/tienda?ofertas=1" size="lg" variant="secondary">
                Ver ofertas
              </ButtonLink>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
