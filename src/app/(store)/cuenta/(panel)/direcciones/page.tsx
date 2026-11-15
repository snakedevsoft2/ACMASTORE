import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { AddressForm } from "../account-forms";

export const metadata: Metadata = { title: "Mis direcciones", robots: { index: false } };

export default async function DireccionesPage({ searchParams }: { searchParams: Promise<{ editar?: string; nueva?: string }> }) {
  const user = await requireUser("/cuenta/direcciones");
  const sp = await searchParams;
  const [addresses, settings] = await Promise.all([
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    getSettings(),
  ]);
  const editing = sp.editar ? addresses.find((a) => a.id === sp.editar) : null;

  if (editing || sp.nueva) {
    return (
      <section className="rounded-xl border border-line bg-carbon p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold uppercase">{editing ? "Editar dirección" : "Nueva dirección"}</h2>
          <Link href="/cuenta/direcciones" className="text-sm text-silver hover:text-white">
            Cancelar
          </Link>
        </div>
        <AddressForm values={editing ?? { fullName: user.name, phone: user.phone ?? "", country: settings.country }} />
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold uppercase">Mis direcciones</h2>
        <ButtonLink href="/cuenta/direcciones?nueva=1" size="sm">
          <Plus className="size-4" /> Agregar
        </ButtonLink>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin />} title="Sin direcciones guardadas" description="Guarda tus direcciones para comprar más rápido." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <article key={a.id} className="flex flex-col rounded-xl border border-line bg-carbon p-5">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-semibold">{a.label || a.fullName}</h3>
                {a.isDefault && <Badge tone="red">Principal</Badge>}
              </div>
              <p className="text-sm text-silver">{a.fullName} · {a.phone}</p>
              <p className="text-sm text-silver">
                {a.line1}
                {a.line2 && `, ${a.line2}`}
              </p>
              <p className="text-sm text-silver">
                {a.city}, {a.state} · {a.country}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <ButtonLink href={`/cuenta/direcciones?editar=${a.id}`} variant="secondary" size="sm">
                  Editar
                </ButtonLink>
                {!a.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button variant="ghost" size="sm">
                      Hacer principal
                    </Button>
                  </form>
                )}
                <form action={deleteAddressAction} className="ml-auto">
                  <input type="hidden" name="id" value={a.id} />
                  <Button variant="danger" size="sm">
                    Eliminar
                  </Button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
