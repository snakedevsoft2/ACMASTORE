import { readFile } from "node:fs/promises";
import { resolveUploadPath } from "@/lib/storage";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const full = resolveUploadPath(path);
  const ext = path[path.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
  if (!full || !TYPES[ext]) return new Response("No encontrado", { status: 404 });
  try {
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext],
        // Los nombres son aleatorios e inmutables: se pueden cachear indefinidamente.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
