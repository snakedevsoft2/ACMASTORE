/**
 * Seed de configuración inicial. Es idempotente: se puede ejecutar varias veces.
 *
 * NO crea productos, pedidos, clientes ni testimonios. Esos datos deben ser reales
 * y se registran desde el panel de administración.
 */
import { PrismaClient, PaymentProviderCode } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PENDING_NOTE =
  "Contenido pendiente de redacción. Edita esta página desde el panel de administración → Páginas.";

const pages = [
  { slug: "nosotros", title: "Nosotros" },
  { slug: "contacto", title: "Contacto" },
  { slug: "preguntas-frecuentes", title: "Preguntas frecuentes" },
  { slug: "politica-de-privacidad", title: "Política de privacidad" },
  { slug: "terminos-y-condiciones", title: "Términos y condiciones" },
  { slug: "politica-de-envios", title: "Política de envíos" },
  { slug: "politica-de-devoluciones", title: "Política de devoluciones" },
];

const paymentMethods: Array<{
  provider: PaymentProviderCode;
  displayName: string;
  description: string;
  sortOrder: number;
}> = [
  {
    provider: "MERCADOPAGO",
    displayName: "Mercado Pago",
    description: "Tarjetas, PSE y otros medios a través de Mercado Pago.",
    sortOrder: 1,
  },
  {
    provider: "STRIPE",
    displayName: "Tarjeta de crédito o débito",
    description: "Pago seguro con tarjeta procesado por Stripe.",
    sortOrder: 2,
  },
  {
    provider: "BANK_TRANSFER",
    displayName: "Transferencia bancaria",
    description: "Realiza la transferencia y envíanos el comprobante.",
    sortOrder: 3,
  },
  {
    provider: "CASH_ON_DELIVERY",
    displayName: "Pago contra entrega",
    description: "Paga en efectivo al recibir tu pedido.",
    sortOrder: 4,
  },
];

async function main() {
  await prisma.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const pm of paymentMethods) {
    // Todos inactivos: el administrador decide cuáles ofrecer.
    await prisma.paymentMethodConfig.upsert({
      where: { provider: pm.provider },
      update: {},
      create: { ...pm, isActive: false },
    });
  }

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, content: PENDING_NOTE, isReviewed: false },
    });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se creó el administrador.");
  } else if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 10 caracteres.");
  } else {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== "ADMIN") {
        await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      }
      console.log(`Administrador existente: ${email}`);
    } else {
      await prisma.user.create({
        data: {
          email,
          name: process.env.ADMIN_NAME?.trim() || "Administrador",
          passwordHash: await bcrypt.hash(password, 12),
          role: "ADMIN",
        },
      });
      console.log(`Administrador creado: ${email}`);
    }
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
