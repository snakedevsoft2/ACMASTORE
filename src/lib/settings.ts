import "server-only";
import { cache } from "react";
import type { StoreSettings } from "@prisma/client";
import { db } from "@/lib/db";
import type { MoneyFormat } from "@/lib/money";

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const existing = await db.storeSettings.findUnique({ where: { id: 1 } });
  return existing ?? db.storeSettings.create({ data: { id: 1 } });
});

export async function getMoneyFormat(): Promise<MoneyFormat> {
  const s = await getSettings();
  return { currency: s.currency, locale: s.locale };
}

export type PublicSettings = Pick<
  StoreSettings,
  | "storeName"
  | "slogan"
  | "logoUrl"
  | "contactEmail"
  | "contactPhone"
  | "whatsapp"
  | "address"
  | "businessHours"
  | "instagramUrl"
  | "facebookUrl"
  | "tiktokUrl"
  | "xUrl"
  | "youtubeUrl"
  | "currency"
  | "locale"
  | "announcement"
>;

export function toPublicSettings(s: StoreSettings): PublicSettings {
  return {
    storeName: s.storeName,
    slogan: s.slogan,
    logoUrl: s.logoUrl,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    whatsapp: s.whatsapp,
    address: s.address,
    businessHours: s.businessHours,
    instagramUrl: s.instagramUrl,
    facebookUrl: s.facebookUrl,
    tiktokUrl: s.tiktokUrl,
    xUrl: s.xUrl,
    youtubeUrl: s.youtubeUrl,
    currency: s.currency,
    locale: s.locale,
    announcement: s.announcement,
  };
}
