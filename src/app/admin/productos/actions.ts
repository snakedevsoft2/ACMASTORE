"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type ProductStatus } from "@prisma/client";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseMoneyToCents } from "@/lib/money";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/validation";

const optionSchema = z.object({
  name: z.string().trim().min(1, "Cada opción necesita un nombre").max(40),
  values: z.array(z.string().trim().min(1).max(40)).min(1, "Cada opción necesita al menos un valor").max(50),
});

const variantSchema = z.object({
  id: z.string().optional(),
  options: z.record(z.string()),
  sku: z.string().trim().max(64).optional().default(""),
  price: z.string().trim().max(20).optional().default(""),
  compareAt: z.string().trim().max(20).optional().default(""),
  stock: z.coerce.number().int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo").max(1_000_000),
  isActive: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(150),
  slug: z.string().trim().max(90).optional().default(""),
  shortDescription: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().max(20_000).optional().default(""),
  categoryId: z.string().optional().default(""),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  price: z.string().min(1, "El precio es obligatorio"),
  compareAt: z.string().optional().default(""),
  isFeatured: z.preprocess((v) => v === "on", z.boolean()),
  seoTitle: z.string().trim().max(70, "Máximo 70 caracteres").optional().default(""),
  seoDescription: z.string().trim().max(170, "Máximo 170 caracteres").optional().default(""),
});

function revalidateCatalog(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/admin/productos");
  if (slug) revalidatePath(`/producto/${slug}`);
}

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertPermission("products:manage");
  const id = String(fd.get("id") ?? "") || null;

  const parsed = productSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const p = parsed.data;

  const priceCents = parseMoneyToCents(p.price);
  if (priceCents == null || priceCents <= 0) return { error: "Precio no válido.", fieldErrors: { price: "Ingresa un precio mayor a 0" } };
  const compareAtCents = p.compareAt ? parseMoneyToCents(p.compareAt) : null;
  if (p.compareAt && (compareAtCents == null || compareAtCents <= priceCents)) {
    return { error: "Precio anterior no válido.", fieldErrors: { compareAt: "Debe ser mayor que el precio de venta (o déjalo vacío)" } };
  }

  let options: z.infer<typeof optionSchema>[];
  let variants: z.infer<typeof variantSchema>[];
  try {
    options = z.array(optionSchema).max(3, "Máximo 3 opciones").parse(JSON.parse(String(fd.get("optionsJson") || "[]")));
    variants = z.array(variantSchema).min(1, "Agrega al menos una variante").max(300).parse(JSON.parse(String(fd.get("variantsJson") || "[]")));
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Datos de variantes no válidos.";
    return { error: msg ?? "Datos de variantes no válidos." };
  }

  // Coherencia entre opciones y variantes.
  const optionNames = options.map((o) => o.name);
  if (new Set(optionNames.map((n) => n.toLowerCase())).size !== optionNames.length) return { error: "Hay opciones con nombre repetido." };
  if (options.length === 0 && variants.length !== 1) return { error: "Un producto sin opciones debe tener exactamente una variante." };
  const combos = new Set<string>();
  for (const v of variants) {
    for (const o of options) {
      if (!o.values.includes(v.options[o.name] ?? "")) return { error: `Una variante no tiene un valor válido para "${o.name}".` };
    }
    const key = optionNames.map((n) => v.options[n]).join("|");
    if (combos.has(key)) return { error: "Hay variantes repetidas." };
    combos.add(key);
  }
  const skus = variants.map((v) => v.sku).filter(Boolean);
  if (new Set(skus).size !== skus.length) return { error: "Hay SKU repetidos entre las variantes." };

  const variantPrices: Array<{ priceCents: number | null; compareAtCents: number | null }> = [];
  for (const v of variants) {
    const vp = v.price ? parseMoneyToCents(v.price) : null;
    const vc = v.compareAt ? parseMoneyToCents(v.compareAt) : null;
    if ((v.price && (vp == null || vp <= 0)) || (v.compareAt && vc == null)) return { error: "Hay un precio de variante no válido." };
    variantPrices.push({ priceCents: vp, compareAtCents: vc });
  }

  const trackStock = fd.get("trackStock") !== "false";
  const slug = slugify(p.slug || p.name);
  if (!slug) return { error: "El enlace no es válido.", fieldErrors: { slug: "Usa letras o números" } };
  const clash = await db.product.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (clash) return { error: "Ya existe un producto con ese enlace.", fieldErrors: { slug: "Este enlace ya está en uso" } };

  const categoryId = p.categoryId || null;
  if (categoryId && !(await db.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    return { error: "La categoría no existe.", fieldErrors: { categoryId: "Selecciona una categoría válida" } };
  }

  const data = {
    name: p.name,
    slug,
    shortDescription: p.shortDescription || null,
    description: p.description || null,
    categoryId,
    status: p.status as ProductStatus,
    priceCents,
    compareAtCents,
    isFeatured: p.isFeatured,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
  };

  let productId: string;
  try {
    productId = await db.$transaction(async (tx) => {
      const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });

      await tx.productOption.deleteMany({ where: { productId: product.id } });
      if (options.length) {
        await tx.productOption.createMany({
          data: options.map((o, i) => ({ productId: product.id, name: o.name, values: o.values, sortOrder: i })),
        });
      }

      const existing = await tx.productVariant.findMany({ where: { productId: product.id } });
      const keep = new Set<string>();

      for (const [i, v] of variants.entries()) {
        const name = options.length ? optionNames.map((n) => v.options[n]).join(" / ") : "Predeterminada";
        const optionsJson = options.length ? Object.fromEntries(optionNames.map((n) => [n, v.options[n]])) : {};
        const fields = {
          name,
          options: optionsJson,
          sku: v.sku || null,
          priceCents: variantPrices[i].priceCents,
          compareAtCents: variantPrices[i].compareAtCents,
          isActive: v.isActive,
          trackStock,
          sortOrder: i,
        };
        const prev = v.id ? existing.find((e) => e.id === v.id) : undefined;
        if (prev) {
          keep.add(prev.id);
          await tx.productVariant.update({ where: { id: prev.id }, data: fields });
          if (trackStock && prev.stock !== v.stock) {
            // Bloquea la fila para no pisar una venta simultánea.
            const cur = await tx.$queryRaw<Array<{ stock: number }>>`SELECT "stock" FROM "ProductVariant" WHERE "id" = ${prev.id} FOR UPDATE`;
            const delta = v.stock - cur[0].stock;
            if (delta !== 0) {
              await tx.productVariant.update({ where: { id: prev.id }, data: { stock: v.stock } });
              await tx.inventoryMovement.create({
                data: { variantId: prev.id, delta, stockAfter: v.stock, reason: delta > 0 ? "RESTOCK" : "ADJUSTMENT", userId: user.id, note: "Edición de producto" },
              });
            }
          }
        } else {
          const created = await tx.productVariant.create({ data: { ...fields, productId: product.id, stock: trackStock ? v.stock : 0 } });
          keep.add(created.id);
          if (trackStock && v.stock > 0) {
            await tx.inventoryMovement.create({
              data: { variantId: created.id, delta: v.stock, stockAfter: v.stock, reason: "INITIAL", userId: user.id, note: "Stock inicial" },
            });
          }
        }
      }

      // Variantes eliminadas: si tienen ventas se desactivan (conserva historial), si no se borran.
      for (const e of existing.filter((x) => !keep.has(x.id))) {
        const sold = await tx.orderItem.count({ where: { variantId: e.id } });
        if (sold > 0) await tx.productVariant.update({ where: { id: e.id }, data: { isActive: false, sku: null } });
        else await tx.productVariant.delete({ where: { id: e.id } });
      }
      return product.id;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Algún SKU ya está en uso por otro producto." };
    }
    console.error("[admin] guardar producto", err);
    return { error: "No se pudo guardar el producto." };
  }

  // Fotos nuevas (opcional en el mismo envío).
  const files = fd.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  const uploadErrors = await storeImages(productId, files, p.name);

  revalidateCatalog(slug);
  if (!id) redirect(`/admin/productos/${productId}?creado=1${uploadErrors ? "&fotos=error" : ""}`);
  return { ok: true, message: uploadErrors ? `Producto guardado, pero ${uploadErrors}` : "Producto guardado." };
}

async function storeImages(productId: string, files: File[], alt: string): Promise<string | null> {
  if (files.length === 0) return null;
  const max = await db.productImage.aggregate({ where: { productId }, _max: { sortOrder: true }, _count: true });
  if (max._count + files.length > 12) return "se permiten máximo 12 fotos por producto.";
  let order = (max._max.sortOrder ?? -1) + 1;
  const errors: string[] = [];
  for (const file of files) {
    try {
      const img = await saveImage(file);
      await db.productImage.create({ data: { productId, url: img.url, width: img.width, height: img.height, alt, sortOrder: order++ } });
    } catch (err) {
      errors.push(err instanceof UploadError ? `${file.name}: ${err.message}` : `${file.name}: error al procesar`);
    }
  }
  return errors.length ? `algunas fotos no se subieron (${errors.join("; ")}).` : null;
}

export async function uploadProductImagesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("products:manage");
  const productId = String(fd.get("productId") ?? "");
  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, slug: true } });
  if (!product) return { error: "Producto no encontrado." };
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Selecciona al menos una foto." };
  const err = await storeImages(productId, files, product.name);
  revalidateCatalog(product.slug);
  revalidatePath(`/admin/productos/${productId}`);
  return err ? { error: `No todas las fotos se subieron: ${err}` } : { ok: true, message: "Fotos agregadas." };
}

export async function deleteProductImageAction(fd: FormData) {
  await assertPermission("products:manage");
  const img = await db.productImage.findUnique({ where: { id: String(fd.get("imageId") ?? "") }, include: { product: { select: { slug: true } } } });
  if (!img) return;
  await db.productImage.delete({ where: { id: img.id } });
  // Solo se borra el archivo si ninguna otra referencia lo usa.
  const others = await db.productImage.count({ where: { url: img.url } });
  if (others === 0) await deleteImage(img.url);
  revalidateCatalog(img.product.slug);
  revalidatePath(`/admin/productos/${img.productId}`);
}

export async function moveProductImageAction(fd: FormData) {
  await assertPermission("products:manage");
  const imageId = String(fd.get("imageId") ?? "");
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const img = await db.productImage.findUnique({ where: { id: imageId }, include: { product: { select: { slug: true } } } });
  if (!img) return;
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } });
  const idx = all.findIndex((x) => x.id === imageId);
  const swap = all[idx + dir];
  if (!swap) return;
  const reordered = [...all];
  [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
  await db.$transaction(reordered.map((x, i) => db.productImage.update({ where: { id: x.id }, data: { sortOrder: i } })));
  revalidateCatalog(img.product.slug);
  revalidatePath(`/admin/productos/${img.productId}`);
}

export async function deleteProductAction(fd: FormData) {
  await assertPermission("products:manage");
  const id = String(fd.get("id") ?? "");
  const product = await db.product.findUnique({ where: { id }, include: { images: true, _count: { select: { orderItems: true } } } });
  if (!product) redirect("/admin/productos");

  if (product._count.orderItems > 0) {
    // Tiene ventas: se archiva para conservar el historial y las estadísticas.
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", isFeatured: false } });
    revalidateCatalog(product.slug);
    redirect("/admin/productos?archivado=1");
  }
  await db.product.delete({ where: { id } });
  for (const img of product.images) await deleteImage(img.url);
  revalidateCatalog(product.slug);
  redirect("/admin/productos?eliminado=1");
}
