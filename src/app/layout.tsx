import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const categories = await db.category
    .findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { name: true }, take: 8 })
    .catch(() => []);
  const names = categories.map((c) => c.name.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}` : names[0];
  const title = s.seoTitle || `${s.storeName} — ${s.slogan}`;
  const description =
    s.seoDescription ||
    (list
      ? `Compra en línea ${list} en ${s.storeName}. ${s.slogan.charAt(0) + s.slogan.slice(1).toLowerCase()}: compra fácil, paga seguro y recibe rápido. Asesoría por WhatsApp.`
      : `${s.storeName}: ${s.slogan.toLowerCase()}. Compra fácil, recibe rápido, con confianza y calidad.`);
  const verificationOther: Record<string, string> = {};
  if (s.facebookDomainVerification) verificationOther["facebook-domain-verification"] = s.facebookDomainVerification;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${s.storeName}` },
    description,
    applicationName: s.storeName,
    openGraph: {
      type: "website",
      siteName: s.storeName,
      title,
      description,
      locale: s.locale.replace("-", "_"),
      url: siteUrl("/"),
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: "/" },
    keywords: [s.storeName, "tienda online", "comprar en línea", ...categories.map((c) => c.name)],
    formatDetection: { telephone: false },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    verification: {
      google: s.googleSiteVerification ?? undefined,
      other: Object.keys(verificationOther).length ? verificationOther : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang={s.locale.split("-")[0] || "es"} className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-dvh bg-ink text-white">{children}</body>
    </html>
  );
}
