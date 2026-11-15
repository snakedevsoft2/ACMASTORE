/**
 * Compresión de imágenes en el navegador antes de subirlas.
 *
 * Vercel limita cada petición a 4,5 MB y una foto de celular pesa 3–8 MB. Aquí se
 * redimensiona a 2000 px y se convierte a WebP (o JPEG si el navegador no codifica WebP).
 * El servidor vuelve a procesarla con sharp, así que esto solo reduce el envío.
 */

/** Tope por envío, con margen bajo el límite de 4,5 MB de Vercel. */
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(file: File, { maxDim = 2000, quality = 0.88, minBytes = 900_000 } = {}): Promise<File> {
  // GIF se deja intacto (perdería la animación); las imágenes pequeñas no se tocan.
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < minBytes) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: blob.type });
  } catch {
    // Formato que el navegador no decodifica (ej. HEIC): se envía tal cual y el servidor decide.
    return file;
  }
}

/** Comprime todas las imágenes de un FormData. Devuelve el nuevo FormData y el peso aproximado. */
export async function compressFormDataImages(fd: FormData): Promise<{ fd: FormData; bytes: number }> {
  const out = new FormData();
  let bytes = 0;
  for (const [key, value] of fd.entries()) {
    if (value instanceof File && value.size > 0) {
      const file = await compressImage(value);
      bytes += file.size;
      out.append(key, file, file.name);
    } else {
      if (typeof value === "string") bytes += value.length;
      out.append(key, value);
    }
  }
  return { fd: out, bytes };
}
