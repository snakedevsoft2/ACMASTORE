import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <p className="font-display text-8xl font-extrabold italic text-acma">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-silver">La página que buscas no existe o fue movida. Puede que el producto ya no esté disponible.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/tienda">Ir a la tienda</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </Container>
  );
}
