"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { compressImage } from "@/lib/client-image";
import type { ActionState } from "@/lib/validation";
import { deleteProductImageAction, moveProductImageAction, uploadProductImagesAction } from "../actions";

export function ImageManager({ productId, images }: { productId: string; images: Array<{ id: string; url: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [progress, setProgress] = useState<string | null>(null);

  // Una foto por petición: así ninguna subida supera el límite de tamaño de Vercel.
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("images") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      setState({ error: "Selecciona al menos una foto." });
      return;
    }
    setState({});
    const errors: string[] = [];
    for (const [i, original] of files.entries()) {
      setProgress(`Subiendo ${i + 1} de ${files.length}…`);
      const file = await compressImage(original);
      const fd = new FormData();
      fd.append("productId", productId);
      fd.append("images", file, file.name);
      try {
        const res = await uploadProductImagesAction({}, fd);
        if (res.error) errors.push(`${original.name}: ${res.error}`);
      } catch {
        errors.push(`${original.name}: error de conexión`);
      }
    }
    setProgress(null);
    form.reset();
    router.refresh();
    const okCount = files.length - errors.length;
    setState(errors.length ? { error: `${okCount} de ${files.length} fotos subidas. ${errors.join(" · ")}` } : { ok: true, message: `${okCount} ${okCount === 1 ? "foto agregada" : "fotos agregadas"}.` });
  };

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="text-sm text-silver">Este producto aún no tiene fotos. Los productos con fotos venden mejor.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.id} className="group relative overflow-hidden rounded-lg border border-line bg-ink-soft">
              <div className="relative aspect-square">
                <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
              </div>
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-acma px-1.5 py-0.5 text-[10px] font-bold uppercase">Principal</span>}
              <div className="flex items-center justify-between border-t border-line px-1 py-1">
                <form action={moveProductImageAction}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button disabled={i === 0} className="p-1.5 text-silver hover:text-white disabled:opacity-20" aria-label="Mover antes">
                    <ArrowLeft className="size-3.5" />
                  </button>
                </form>
                <form action={deleteProductImageAction}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <button className="p-1.5 text-silver hover:text-acma" aria-label="Eliminar foto">
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
                <form action={moveProductImageAction}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button disabled={i === images.length - 1} className="p-1.5 text-silver hover:text-white disabled:opacity-20" aria-label="Mover después">
                    <ArrowRight className="size-3.5" />
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="productId" value={productId} />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm text-silver hover:border-acma hover:text-white">
          <ImagePlus className="size-4 text-acma" />
          <input type="file" name="images" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="max-w-56 text-xs file:hidden" />
        </label>
        <SubmitButton pending={progress != null} variant="secondary" size="sm" pendingText={progress ?? "Subiendo…"}>
          Subir fotos
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
