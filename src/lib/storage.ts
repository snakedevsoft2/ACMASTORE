import "server-only";
import { storeImageBuffer, UploadError, type StoredImage } from "./image-store";

export { deleteImage, resolveUploadPath, UPLOAD_DIR, UPLOAD_URL_PREFIX, UploadError } from "./image-store";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/** Valida un archivo subido desde el panel y lo guarda optimizado. */
export async function saveImage(file: File, opts: { maxSize?: number; quality?: number } = {}): Promise<StoredImage> {
  if (!ALLOWED.has(file.type)) throw new UploadError("Formato no permitido. Usa JPG, PNG, WebP, AVIF o GIF.");
  if (file.size > MAX_BYTES) throw new UploadError("La imagen supera 8 MB.");
  if (file.size === 0) throw new UploadError("El archivo está vacío.");
  return storeImageBuffer(Buffer.from(await file.arrayBuffer()), opts);
}
