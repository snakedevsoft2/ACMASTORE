/**
 * Núcleo del almacenamiento de imágenes, sin dependencias de Next.js: lo usan el panel
 * (vía storage.ts) y los scripts de línea de comandos (importación del catálogo).
 *
 * Las imágenes se re-codifican a WebP con sharp (elimina metadatos/EXIF y cualquier
 * contenido no-imagen) y se limitan a 1600 px.
 * - Con BLOB_READ_WRITE_TOKEN (Vercel): se guardan en Vercel Blob.
 * - Sin él (desarrollo / servidor propio): se guardan en disco, en UPLOAD_DIR.
 */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { del, put } from "@vercel/blob";
import sharp, { type OutputInfo } from "sharp";

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const isBlobUrl = (url: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
export const UPLOAD_URL_PREFIX = "/uploads/";

export class UploadError extends Error {}

export type StoredImage = { url: string; width: number; height: number };

/** Optimiza y guarda una imagen a partir de sus bytes. */
export async function storeImageBuffer(input: Buffer, opts: { maxSize?: number; quality?: number } = {}): Promise<StoredImage> {
  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(input, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: opts.maxSize ?? 1600, height: opts.maxSize ?? 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: opts.quality ?? 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new UploadError("El archivo no es una imagen válida.");
  }

  const now = new Date();
  const sub = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${randomBytes(12).toString("hex")}.webp`;
  const dims = { width: output.info.width, height: output.info.height };

  if (useBlob()) {
    const blob = await put(`uploads/${sub}/${name}`, output.data, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      // Nombres aleatorios e inmutables: se pueden cachear un año.
      cacheControlMaxAge: 31_536_000,
    });
    return { url: blob.url, ...dims };
  }

  await mkdir(path.join(UPLOAD_DIR, ...sub.split("/")), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, ...sub.split("/"), name), output.data);
  return { url: `${UPLOAD_URL_PREFIX}${sub}/${name}`, ...dims };
}

/** Resuelve una URL /uploads/... a ruta en disco, impidiendo salir del directorio. */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.some((s) => !/^[a-zA-Z0-9._-]+$/.test(s) || s.startsWith("."))) return null;
  const full = path.resolve(UPLOAD_DIR, ...segments);
  return full.startsWith(UPLOAD_DIR + path.sep) ? full : null;
}

export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  if (isBlobUrl(url)) {
    if (useBlob()) await del(url).catch((err) => console.error("[storage] no se pudo borrar", url, err));
    return;
  }
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return;
  const full = resolveUploadPath(url.slice(UPLOAD_URL_PREFIX.length).split("/"));
  if (full) await unlink(full).catch(() => undefined);
}
