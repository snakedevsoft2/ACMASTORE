import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function SinPermisoPage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ShieldAlert className="size-14 text-acma" />
      <h1 className="mt-4 font-display text-3xl font-bold uppercase">Acceso restringido</h1>
      <p className="mt-2 max-w-md text-silver">Tu rol no tiene permiso para esta sección. Si lo necesitas, solicítalo a un administrador.</p>
      <ButtonLink href="/admin" className="mt-6">
        Volver al dashboard
      </ButtonLink>
    </div>
  );
}
