import Image from "next/image";
import emblem from "@/assets/brand/acma-emblema.webp";
import { cn } from "@/lib/utils";

/**
 * Logotipo de la empresa. Por defecto, el emblema oficial de ACMA STORE.
 * Si el administrador sube otro logotipo en Configuración → Tienda, se usa ese.
 */
export function Logo({
  logoUrl,
  storeName = "ACMA STORE",
  className,
  priority = false,
}: {
  logoUrl?: string | null;
  storeName?: string;
  className?: string;
  priority?: boolean;
}) {
  if (logoUrl) {
    return (
      <Image src={logoUrl} alt={storeName} width={180} height={48} priority={priority} className={cn("h-10 w-auto object-contain", className)} />
    );
  }
  return <BrandEmblem alt={storeName} className={className} priority={priority} />;
}

/** Emblema oficial circular (fondo negro, se integra con el fondo de la tienda). */
export function BrandEmblem({ className, alt = "ACMA STORE", priority = false }: { className?: string; alt?: string; priority?: boolean }) {
  return <Image src={emblem} alt={alt} sizes="128px" priority={priority} className={cn("size-14 shrink-0 rounded-full", className)} />;
}
