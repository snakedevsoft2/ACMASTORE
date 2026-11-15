import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { getAvailablePaymentMethods, isOnlineProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, user, settings, shippingMethods, paymentMethods] = await Promise.all([
    getCart(),
    getCurrentUser(),
    getSettings(),
    db.shippingMethod.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] }),
    getAvailablePaymentMethods(),
  ]);
  if (cart.lines.length === 0 || cart.hasIssues) redirect("/carrito");

  const addresses = user
    ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
    : [];

  return (
    <Container className="py-10">
      <h1 className="mb-8 font-display text-4xl font-extrabold uppercase italic sm:text-5xl">
        Finalizar <span className="text-acma">compra</span>
      </h1>
      <CheckoutForm
        cart={cart}
        user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          fullName: a.fullName,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          country: a.country,
          notes: a.notes,
          isDefault: a.isDefault,
        }))}
        shippingMethods={shippingMethods.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          priceCents: s.priceCents,
          freeOverCents: s.freeOverCents,
          estimatedDays: s.estimatedDays,
        }))}
        paymentMethods={paymentMethods.map((p) => ({
          provider: p.provider,
          displayName: p.displayName,
          description: p.description,
          isOnline: isOnlineProvider(p.provider),
        }))}
        defaultCountry={settings.country}
      />
    </Container>
  );
}
