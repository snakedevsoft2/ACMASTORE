/**
 * Importa el catálogo desde un archivo JSON y una carpeta de fotos.
 *
 *   npm run db:import-catalog                       (usa prisma/catalogo/catalogo-inicial.json)
 *   npm run db:import-catalog -- ruta/otro.json
 *
 * - Crea las categorías que falten (no modifica las existentes).
 * - Crea los productos que falten, identificados por su enlace (slug). Si ya existen, los omite:
 *   se puede ejecutar varias veces sin duplicar nada.
 * - Optimiza las fotos (WebP, máx. 1600 px). Con BLOB_READ_WRITE_TOKEN las sube a Vercel Blob;
 *   sin él, las guarda en UPLOAD_DIR.
 * - Los productos se crean "sin control de inventario" (siempre disponibles): el archivo no trae
 *   existencias. Para llevar stock, actívalo en cada producto desde el panel.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { storeImageBuffer } from "../src/lib/image-store";
import { slugify } from "../src/lib/utils";

type ManifestProduct = {
  category: string;
  name: string;
  price: number;
  compareAt?: number;
  short?: string;
  isNew?: boolean;
  featured?: boolean;
  images: string[];
  option?: { name: string; values: string[] };
};

type Manifest = {
  imagesDir: string;
  categories: Array<{ slug: string; name: string; description?: string; sortOrder?: number }>;
  products: ManifestProduct[];
};

const prisma = new PrismaClient();

async function main() {
  const manifestPath = path.resolve(process.argv[2] ?? "prisma/catalogo/catalogo-inicial.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const imagesDir = path.resolve(path.dirname(manifestPath), "..", "..", manifest.imagesDir);
  console.log(`Catálogo: ${manifestPath}\nFotos: ${imagesDir}\nDestino de fotos: ${process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob" : "disco local"}\n`);

  // Categorías
  const categoryIds = new Map<string, string>();
  for (const c of manifest.categories) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    const cat =
      existing ??
      (await prisma.category.create({
        data: { slug: c.slug, name: c.name, description: c.description ?? null, sortOrder: c.sortOrder ?? 0 },
      }));
    categoryIds.set(c.slug, cat.id);
    console.log(`${existing ? "·" : "+"} Categoría ${c.name}`);
  }

  // Validación previa: precios y fotos.
  const problems: string[] = [];
  for (const p of manifest.products) {
    if (!categoryIds.has(p.category)) problems.push(`${p.name}: categoría "${p.category}" no definida`);
    if (!Number.isInteger(p.price) || p.price <= 0) problems.push(`${p.name}: precio no válido`);
    if (p.compareAt != null && p.compareAt <= p.price) problems.push(`${p.name}: el precio anterior debe ser mayor`);
    if (p.images.length === 0) problems.push(`${p.name}: sin fotos`);
  }
  if (problems.length) throw new Error(`El catálogo tiene errores:\n- ${problems.join("\n- ")}`);

  // Los marcados como nuevos se crean al final para que aparezcan primero en "Novedades".
  const ordered = [...manifest.products].sort((a, b) => Number(a.isNew ?? false) - Number(b.isNew ?? false));
  let created = 0;
  let skipped = 0;

  for (const p of ordered) {
    const slug = slugify(p.name);
    if (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      skipped++;
      continue;
    }

    const images = [];
    for (const rel of p.images) {
      const buffer = await readFile(path.join(imagesDir, rel)).catch(() => {
        throw new Error(`No se encontró la foto "${rel}" de ${p.name}`);
      });
      images.push(await storeImageBuffer(buffer));
    }

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        shortDescription: p.short ?? null,
        status: "ACTIVE",
        priceCents: p.price * 100,
        compareAtCents: p.compareAt != null ? p.compareAt * 100 : null,
        isFeatured: p.featured ?? false,
        categoryId: categoryIds.get(p.category)!,
        images: { create: images.map((img, i) => ({ url: img.url, width: img.width, height: img.height, alt: p.name, sortOrder: i })) },
        options: p.option ? { create: [{ name: p.option.name, values: p.option.values, sortOrder: 0 }] } : undefined,
        variants: {
          create: p.option
            ? p.option.values.map((value, i) => ({ name: value, options: { [p.option!.name]: value }, trackStock: false, sortOrder: i }))
            : [{ name: "Predeterminada", options: {}, trackStock: false }],
        },
      },
    });
    created++;
    console.log(`+ ${p.name}`);
  }

  console.log(`\nListo: ${created} productos creados, ${skipped} ya existían.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
