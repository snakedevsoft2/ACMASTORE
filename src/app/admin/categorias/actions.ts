"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteImage, saveImage, UploadError } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { invalid, type ActionState } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
  parentId: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertPermission("products:manage");
  const id = String(fd.get("id") ?? "") || null;
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const c = parsed.data;

  const slug = slugify(c.slug || c.name);
  if (!slug) return { error: "Enlace no válido.", fieldErrors: { slug: "Usa letras o números" } };
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { error: "Ya existe una categoría con ese enlace.", fieldErrors: { slug: "En uso" } };

  const parentId = c.parentId || null;
  if (parentId) {
    if (parentId === id) return { error: "Una categoría no puede ser su propia categoría padre." };
    const parent = await db.category.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "La categoría padre no existe." };
    if (parent.parentId) return { error: "Solo se permiten dos niveles: elige una categoría principal como padre." };
    if (id && (await db.category.count({ where: { parentId: id } })) > 0) {
      return { error: "Esta categoría tiene subcategorías, así que no puede ser subcategoría de otra." };
    }
  }

  let imageUrl: string | undefined;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = (await saveImage(file, { maxSize: 1200 })).url;
    } catch (err) {
      return { error: err instanceof UploadError ? err.message : "No se pudo procesar la imagen." };
    }
  }
  const removeImage = fd.get("removeImage") === "on";
  const previous = id ? await db.category.findUnique({ where: { id }, select: { imageUrl: true } }) : null;

  const data = {
    name: c.name,
    slug,
    description: c.description || null,
    parentId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    ...(imageUrl ? { imageUrl } : removeImage ? { imageUrl: null } : {}),
  };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  if ((imageUrl || removeImage) && previous?.imageUrl) await deleteImage(previous.imageUrl);

  revalidatePath("/", "layout");
  revalidatePath("/admin/categorias");
  redirect("/admin/categorias?guardado=1");
}

export async function deleteCategoryAction(fd: FormData) {
  await assertPermission("products:manage");
  const id = String(fd.get("id") ?? "");
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!cat) return;
  // Los productos quedan "Sin categoría" y las subcategorías pasan a ser principales (onDelete: SetNull).
  await db.category.delete({ where: { id } });
  if (cat.imageUrl) await deleteImage(cat.imageUrl);
  revalidatePath("/", "layout");
  redirect("/admin/categorias?eliminada=1");
}
