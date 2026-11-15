/**
 * Prueba de punta a punta de ACMA STORE con Microsoft Edge (playwright-core).
 *
 * ⚠ Crea productos, pedidos y clientes de PRUEBA. Ejecútala SOLO contra una base de datos
 * de pruebas, nunca contra la de producción. Ver README → "Pruebas de punta a punta".
 *
 * Variables: E2E_BASE_URL, DATABASE_URL (de pruebas), ADMIN_EMAIL, ADMIN_PASSWORD,
 *            CRON_SECRET, E2E_SHOTS (carpeta opcional para capturas).
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.E2E_SHOTS ?? path.resolve("storage/e2e-shots");
const { ADMIN_EMAIL, ADMIN_PASSWORD, CRON_SECRET } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Faltan ADMIN_EMAIL / ADMIN_PASSWORD");
if (!/test|e2e/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Por seguridad, DATABASE_URL debe apuntar a una base de pruebas (su nombre debe contener 'test' o 'e2e').");
}
mkdirSync(SHOTS, { recursive: true });

const db = new PrismaClient();
let n = 0;
const ok = (msg) => console.log(`  ✔ ${String(++n).padStart(2, "0")}. ${msg}`);
const section = (t) => console.log(`\n▸ ${t}`);
function assert(cond, msg) {
  if (!cond) throw new Error(`FALLÓ: ${msg}`);
}
const shot = (page, name, fullPage = false) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
const RUN = Date.now().toString(36);

// Foto de prueba generada (no se descarga nada).
const imgPath = path.join(SHOTS, "foto-prueba.png");
writeFileSync(
  imgPath,
  await sharp({ create: { width: 900, height: 900, channels: 3, background: "#1A1A1A" } })
    .composite([{ input: Buffer.from(`<svg width="900" height="900"><rect x="250" y="250" width="400" height="400" rx="40" fill="#E50914"/></svg>`) }])
    .png()
    .toBuffer(),
);

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function login(page, email, password) {
  await page.goto(`${BASE}/cuenta/ingresar`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/cuenta/ingresar"));
}

async function fillCheckout(page, d) {
  await page.fill('input[name="email"]', d.email);
  await page.fill('input[name="customerName"]', d.name);
  await page.fill('input[name="customerPhone"]', "+57 300 123 4567");
  await page.fill('input[name="fullName"]', d.name);
  await page.fill('input[name="phone"]', "+57 300 123 4567");
  await page.fill('input[name="line1"]', "Calle 10 # 20-30");
  await page.fill('input[name="city"]', "Bogotá");
  await page.fill('input[name="state"]', "Cundinamarca");
  await page.check(`input[name="paymentProvider"][value="${d.payment}"]`);
  await page.check('input[name="acceptTerms"]');
}

const money = (s) => Number(String(s).replace(/[^\d]/g, ""));

try {
  // ───────────────────────────── ADMINISTRADOR ─────────────────────────────
  section("Panel de administración");
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const a = await adminCtx.newPage();

  await a.goto(`${BASE}/admin`);
  assert(a.url().includes("/cuenta/ingresar"), "/admin sin sesión debe redirigir al login");
  ok("/admin sin sesión redirige al login");

  await login(a, ADMIN_EMAIL, ADMIN_PASSWORD);
  assert(new URL(a.url()).pathname === "/admin", "el admin debe llegar al dashboard");
  await a.getByText("Antes de vender").waitFor();
  ok("Login de administrador → dashboard con lista de tareas pendientes");

  await a.goto(`${BASE}/admin/categorias?nueva=1`);
  await a.fill('input[name="name"]', `Cascos ${RUN}`);
  await a.fill('input[name="slug"]', `cascos-${RUN}`);
  await a.fill('textarea[name="description"]', "Cascos certificados para moto.");
  await a.getByRole("button", { name: "Crear categoría" }).click();
  await a.waitForURL(/guardado=1/);
  ok("Categoría creada");

  // Producto simple con descuento y foto.
  await a.goto(`${BASE}/admin/productos/nuevo`);
  await a.fill('input[name="name"]', `Casco Integral Pro ${RUN}`);
  await a.fill('input[name="shortDescription"]', "Casco integral con visor antirrayas.");
  await a.fill('textarea[name="description"]', "## Características\n\n- Visor antirrayas\n- Forro removible\n\nIdeal para **ciudad y carretera**.");
  await a.fill('input[name="price"]', "350.000");
  await a.fill('input[name="compareAt"]', "420000");
  await a.selectOption('select[name="status"]', "ACTIVE");
  await a.selectOption('select[name="categoryId"]', { label: `Cascos ${RUN}` });
  await a.check('input[name="isFeatured"]');
  await a.fill('input[name="_sku"]', `CAS-${RUN}`);
  await a.fill('input[name="_stock"]', "3");
  await a.setInputFiles('input[name="newImages"]', imgPath);
  await a.getByRole("button", { name: "Crear producto" }).click();
  await a.waitForURL(/\/admin\/productos\/[^/]+\?creado=1/, { timeout: 30_000 });
  const productA = await db.product.findFirst({ where: { name: `Casco Integral Pro ${RUN}` }, include: { variants: true, images: true } });
  assert(productA?.priceCents === 35_000_000 && productA.compareAtCents === 42_000_000, "precios guardados en centavos");
  assert(productA.variants.length === 1 && productA.variants[0].stock === 3, "variante única con stock 3");
  assert(productA.images.length === 1 && productA.images[0].url.endsWith(".webp"), "foto convertida a WebP");
  ok("Producto simple creado: precio, precio anterior, stock 3, foto optimizada a WebP");

  // Segunda foto desde el gestor de fotos (sube una foto por petición).
  await a.setInputFiles('input[name="images"]', imgPath);
  await a.getByRole("button", { name: "Subir fotos" }).click();
  await a.getByText("1 foto agregada.").waitFor({ timeout: 30_000 });
  assert((await db.productImage.count({ where: { productId: productA.id } })) === 2, "segunda foto guardada");
  ok("Gestor de fotos: subida adicional una por una");

  // Foto pesada (como la de un celular): sin compresión en el navegador superaría el límite de 4 MB.
  const bigPath = path.join(SHOTS, "foto-pesada.jpg");
  writeFileSync(
    bigPath,
    await sharp({ create: { width: 4000, height: 3000, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 40 } } })
      .jpeg({ quality: 95 })
      .toBuffer(),
  );
  const bigMb = (await import("node:fs")).statSync(bigPath).size / 1024 / 1024;
  assert(bigMb > 4.5, `la foto de prueba debe superar 4,5 MB (pesa ${bigMb.toFixed(1)} MB)`);
  await a.setInputFiles('input[name="images"]', bigPath);
  await a.getByRole("button", { name: "Subir fotos" }).click();
  await a.getByText("1 foto agregada.").waitFor({ timeout: 60_000 });
  const imgs = await db.productImage.findMany({ where: { productId: productA.id }, orderBy: { sortOrder: "asc" } });
  assert(imgs.length === 3 && imgs[2].width <= 1600, "la foto pesada se guardó redimensionada");
  ok(`Foto de ${bigMb.toFixed(1)} MB comprimida en el navegador y guardada (≤1600 px)`);

  // Producto con variantes.
  await a.goto(`${BASE}/admin/productos/nuevo`);
  await a.fill('input[name="name"]', `Chaqueta Moto ${RUN}`);
  await a.fill('input[name="price"]', "280000");
  await a.selectOption('select[name="status"]', "ACTIVE");
  await a.getByText("Este producto tiene variantes").click();
  await a.getByLabel("Valores separados por coma").fill("S, M");
  await a.getByRole("button", { name: "Generar combinaciones" }).click();
  const skuInputs = a.getByLabel("SKU", { exact: true });
  await skuInputs.nth(0).fill(`CHQ-S-${RUN}`);
  await skuInputs.nth(1).fill(`CHQ-M-${RUN}`);
  await a.getByLabel("Stock", { exact: true }).nth(0).fill("2");
  await a.getByLabel("Precio propio").nth(1).fill("300000");
  await a.getByRole("button", { name: "Crear producto" }).click();
  await a.waitForURL(/\?creado=1/, { timeout: 30_000 });
  const productB = await db.product.findFirst({ where: { name: `Chaqueta Moto ${RUN}` }, include: { variants: { orderBy: { sortOrder: "asc" } }, options: true } });
  assert(productB?.options[0]?.name === "Talla" && productB.variants.length === 2, "opción Talla con 2 variantes");
  assert(productB.variants[0].stock === 2 && productB.variants[1].stock === 0 && productB.variants[1].priceCents === 30_000_000, "stock y precio por variante");
  ok("Producto con variantes (Talla S/M), stock y precio propio por variante");

  await a.goto(`${BASE}/admin/configuracion/envios`);
  // Desactiva métodos de ejecuciones anteriores para que el total esperado sea determinista.
  await db.shippingMethod.updateMany({ data: { isActive: false } });
  const ship = a.locator("form", { has: a.getByRole("button", { name: "Agregar método" }) });
  await ship.locator('input[name="name"]').fill(`Envío estándar ${RUN}`);
  await ship.locator('input[name="estimatedDays"]').fill("2 a 4 días hábiles");
  await ship.locator('input[name="price"]').fill("15000");
  await ship.locator('input[name="freeOver"]').fill("1000000");
  await ship.getByRole("button", { name: "Agregar método" }).click();
  await a.getByText("Método de envío guardado.").waitFor();
  ok("Método de envío creado (15.000, gratis desde 1.000.000)");

  await a.goto(`${BASE}/admin/configuracion/pagos`);
  const stripeForm = a.locator('form:has(input[name="provider"][value="STRIPE"])');
  assert(await stripeForm.locator('input[name="isActive"]').isDisabled(), "Stripe sin credenciales no debe poder activarse");
  ok("Stripe sin credenciales: no se puede activar (no se simulan pagos)");
  const cod = a.locator('form:has(input[name="provider"][value="CASH_ON_DELIVERY"])');
  await cod.locator('input[name="isActive"]').check();
  await cod.getByRole("button", { name: "Guardar" }).click();
  await cod.getByText("Método de pago guardado.").waitFor();
  const bank = a.locator('form:has(input[name="provider"][value="BANK_TRANSFER"])');
  await bank.locator('textarea[name="instructions"]').fill("");
  await bank.locator('input[name="isActive"]').check();
  await bank.getByRole("button", { name: "Guardar" }).click();
  await bank.getByText("escribe los datos bancarios").waitFor();
  await bank.locator('textarea[name="instructions"]').fill("Banco de prueba\nCuenta de ahorros 000-000000-00\nTitular: ACMA STORE");
  await bank.getByRole("button", { name: "Guardar" }).click();
  await bank.getByText("Método de pago guardado.").waitFor();
  ok("Contra entrega y transferencia activados (la transferencia exige datos bancarios)");

  await a.goto(`${BASE}/admin/promociones`);
  await a.fill('input[name="code"]', `acma${RUN}`);
  await a.fill('input[name="value"]', "10");
  await a.getByRole("button", { name: "Crear cupón" }).click();
  await a.getByText("Cupón guardado.").waitFor();
  const COUPON = `ACMA${RUN}`.toUpperCase();
  ok(`Cupón ${COUPON} (10%) creado`);
  await shot(a, "admin-dashboard-antes");

  await a.goto(`${BASE}/admin/configuracion`);
  await a.fill('input[name="whatsapp"]', "+57 300 000 0000");
  await a.getByRole("button", { name: "Guardar configuración" }).click();
  await a.getByText("Configuración guardada.").waitFor();
  ok("WhatsApp de ventas configurado desde el panel");

  await a.goto(`${BASE}/admin/productos/nuevo`);
  await a.fill('input[name="name"]', `Producto sin inventario ${RUN}`);
  await a.fill('input[name="price"]', "10000");
  await a.selectOption('select[name="status"]', "ACTIVE");
  await a.getByText("Controlar inventario").click();
  assert((await a.locator('input[name="_stock"]').count()) === 0, "sin control de inventario no se pide stock");
  await a.getByRole("button", { name: "Crear producto" }).click();
  await a.waitForURL(/\?creado=1/, { timeout: 30_000 });
  const productU = await db.product.findFirst({ where: { name: `Producto sin inventario ${RUN}` }, include: { variants: true } });
  assert(productU.variants.every((v) => v.trackStock === false && v.stock === 0), "variante sin control de inventario");
  ok("Producto “sin control de inventario” creado (sin pedir stock)");

  // ───────────────────────────── INVITADO ─────────────────────────────
  section("Compra como invitado");
  const guestCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const g = await guestCtx.newPage();
  await g.goto(BASE);
  await g.locator("#destacados").getByText(`Casco Integral Pro ${RUN}`).waitFor();
  ok("El producto destacado aparece en la página de inicio");
  await shot(g, "inicio-con-productos", true);

  await g.goto(`${BASE}/tienda?q=${encodeURIComponent(`Casco Integral Pro ${RUN}`)}`);
  await g.getByRole("link", { name: `Casco Integral Pro ${RUN}` }).first().waitFor();
  await g.goto(`${BASE}/tienda/cascos-${RUN}?orden=precio-asc`);
  assert((await g.locator("article").count()) === 1, "la categoría muestra solo su producto");
  ok("Búsqueda, categoría y orden funcionan");

  await g.goto(`${BASE}/producto/${productA.slug}`);
  await g.getByText("¡Solo quedan 3 unidades!").waitFor();
  await g.getByText(/^Ahorras \$\s?70\.000$/).waitFor();
  await g.getByText("-17%", { exact: true }).first().waitFor();
  await g.getByRole("button", { name: "Aumentar cantidad" }).click();
  await g.getByRole("button", { name: "Agregar al carrito" }).click();
  await g.getByRole("dialog", { name: "Carrito de compras" }).getByText("Tu carrito (2)").waitFor();
  ok("Ficha de producto: stock, descuento, 2 unidades al carrito y panel lateral");
  await shot(g, "carrito-lateral");

  await g.goto(`${BASE}/checkout`);
  await fillCheckout(g, { email: `invitado-${RUN}@example.com`, name: "Cliente Invitado", payment: "CASH_ON_DELIVERY" });
  await g.fill("#coupon-input", COUPON.toLowerCase());
  await g.getByRole("button", { name: "Aplicar" }).click();
  await g.getByLabel("Quitar cupón").waitFor();
  const totalText = await g.locator("aside").getByText(/\$/).last().textContent();
  assert(money(totalText) === 645000, `total esperado 645.000 (700.000 − 10% + 15.000), obtenido ${totalText}`);
  ok("Checkout: cupón aplicado y total calculado = 645.000");
  await shot(g, "checkout", true);
  await g.getByRole("button", { name: "Confirmar pedido" }).click();
  await g.waitForURL(/\/pedido\/.+nuevo=1/, { timeout: 30_000 });
  await g.getByText("¡Pedido recibido!").waitFor();
  const order1 = await db.order.findFirst({ where: { email: `invitado-${RUN}@example.com` }, include: { items: true } });
  assert(order1.subtotalCents === 70_000_000 && order1.discountCents === 7_000_000 && order1.shippingCents === 1_500_000 && order1.totalCents === 64_500_000, "totales del pedido en BD");
  assert(order1.paymentStatus === "PENDING" && order1.status === "PENDING", "contra entrega queda pendiente, NO pagado");
  const vA1 = await db.productVariant.findUnique({ where: { id: productA.variants[0].id } });
  assert(vA1.stock === 1, `stock debe bajar de 3 a 1 (es ${vA1.stock})`);
  const coupon1 = await db.coupon.findUnique({ where: { code: COUPON } });
  assert(coupon1.usedCount === 1, "uso del cupón registrado");
  ok("Pedido creado: totales correctos, pago pendiente (no simulado), stock 3→1, cupón usado");
  await shot(g, "confirmacion-pedido", true);

  // ─────────────── Concurrencia: dos compradores, una unidad ───────────────
  section("Inventario atómico: dos compras simultáneas de la última unidad");
  const h = await (await browser.newContext()).newPage();
  for (const p of [g, h]) {
    await p.goto(`${BASE}/producto/${productA.slug}`);
    await p.getByText("¡Solo queda 1 unidad!").waitFor();
    await p.getByRole("button", { name: "Agregar al carrito" }).click();
    await p.getByRole("dialog", { name: "Carrito de compras" }).getByText("Tu carrito (1)").waitFor();
    await p.goto(`${BASE}/checkout`);
    await fillCheckout(p, { email: `concurrente-${RUN}-${p === g ? "a" : "b"}@example.com`, name: "Comprador Concurrente", payment: "CASH_ON_DELIVERY" });
  }
  await Promise.all([g.getByRole("button", { name: "Confirmar pedido" }).click(), h.getByRole("button", { name: "Confirmar pedido" }).click()]);
  const outcomes = await Promise.all(
    [g, h].map((p) =>
      Promise.race([
        p.waitForURL(/\/pedido\//, { timeout: 30_000 }).then(() => "pedido"),
        // Si choca en la reserva atómica: "sin stock"; si llega después: el carrito ya refleja el agotado.
        p.getByText(/ya no hay stock suficiente|productos de tu carrito cambiaron/).waitFor({ timeout: 30_000 }).then(() => "sin-stock"),
      ]),
    ),
  );
  assert(outcomes.sort().join() === "pedido,sin-stock", `exactamente una compra debe ganar: ${outcomes}`);
  const vA2 = await db.productVariant.findUnique({ where: { id: productA.variants[0].id } });
  assert(vA2.stock === 0, `stock final 0, nunca negativo (es ${vA2.stock})`);
  ok("Una compra gana, la otra recibe “sin stock”; stock final 0 (sin sobreventa)");

  section("Producto sin control de inventario y WhatsApp");
  const u = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await u.goto(`${BASE}/producto/${productU.slug}`);
  await u.getByText("Disponible", { exact: true }).waitFor();
  const wa = u.getByRole("link", { name: /Separar .* por WhatsApp/ }).first();
  const waHref = await wa.getAttribute("href");
  assert(waHref.startsWith("https://wa.me/573000000000?text=") && decodeURIComponent(waHref).includes(`Producto sin inventario ${RUN}`), `enlace de WhatsApp con el producto: ${waHref}`);
  assert(await u.getByRole("link", { name: "Escríbenos por WhatsApp para recibir asesoría" }).isVisible(), "botón flotante de asesoría visible");
  ok("“Separar por WhatsApp” abre el chat con el producto y el precio; botón flotante de asesoría visible");
  for (let i = 0; i < 4; i++) await u.getByRole("button", { name: "Aumentar cantidad" }).click();
  await u.getByRole("button", { name: "Comprar ahora" }).click();
  await u.waitForURL(`${BASE}/checkout`);
  await fillCheckout(u, { email: `sin-inventario-${RUN}@example.com`, name: "Cliente Sin Inventario", payment: "CASH_ON_DELIVERY" });
  await u.getByRole("button", { name: "Confirmar pedido" }).click();
  await u.waitForURL(/\/pedido\/.+nuevo=1/, { timeout: 30_000 });
  const vU = await db.productVariant.findUnique({ where: { id: productU.variants[0].id } });
  const movU = await db.inventoryMovement.count({ where: { variantId: vU.id } });
  const orderU = await db.order.findFirst({ where: { email: `sin-inventario-${RUN}@example.com` }, include: { items: true } });
  assert(orderU.items[0].quantity === 5 && vU.stock === 0 && movU === 0, "se vendieron 5 unidades sin tocar el stock");
  ok("Compra de 5 unidades de un producto sin control de inventario (stock intacto, sin movimientos)");

  // ───────────────────────────── CLIENTE REGISTRADO ─────────────────────────────
  section("Cliente registrado");
  const custEmail = `cliente-${RUN}@example.com`;
  const c = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await c.goto(`${BASE}/cuenta/registro`);
  await c.fill('input[name="name"]', "Laura Cliente");
  await c.fill('input[name="email"]', custEmail);
  await c.fill('input[name="password"]', "corta");
  await c.fill('input[name="confirmPassword"]', "corta");
  await c.check('input[name="acceptTerms"]');
  await c.getByRole("button", { name: "Crear cuenta" }).click();
  await c.getByText("al menos 8 caracteres").waitFor();
  assert((await c.inputValue('input[name="name"]')) === "Laura Cliente", "el formulario conserva lo escrito tras un error");
  await c.fill('input[name="password"]', "ClaveSegura123");
  await c.fill('input[name="confirmPassword"]', "ClaveSegura123");
  await c.getByRole("button", { name: "Crear cuenta" }).click();
  await c.waitForURL(`${BASE}/cuenta`);
  ok("Registro con validación (sin perder lo escrito) → panel de cuenta");

  await c.goto(`${BASE}/producto/${productB.slug}`);
  const mBtn = c.getByRole("button", { name: "M", exact: true });
  assert((await mBtn.getAttribute("class")).includes("line-through"), "la talla M agotada se marca");
  await c.getByRole("button", { name: "Comprar ahora" }).click();
  await c.waitForURL(`${BASE}/checkout`);
  await c.fill('input[name="customerPhone"]', "+57 310 000 0000");
  await c.fill('input[name="phone"]', "+57 310 000 0000");
  await c.fill('input[name="line1"]', "Carrera 7 # 80-12");
  await c.fill('input[name="city"]', "Medellín");
  await c.fill('input[name="state"]', "Antioquia");
  await c.check('input[name="paymentProvider"][value="BANK_TRANSFER"]');
  await c.check('input[name="acceptTerms"]');
  await shot(c, "checkout-movil", true);
  await c.getByRole("button", { name: "Confirmar pedido" }).click();
  await c.waitForURL(/\/pedido\//, { timeout: 30_000 });
  await c.getByText("Datos para la transferencia").waitFor();
  await c.getByText("Cuenta de ahorros 000-000000-00").waitFor();
  ok("“Comprar ahora” (talla S) con transferencia → instrucciones bancarias en la confirmación");
  await shot(c, "confirmacion-transferencia-movil", true);

  const order2 = await db.order.findFirst({ where: { email: custEmail } });
  await c.goto(`${BASE}/cuenta/pedidos`);
  await c.getByText(`ACMA-${String(order2.number).padStart(6, "0")}`).waitFor();
  await c.goto(`${BASE}/cuenta/direcciones`);
  await c.getByText("Carrera 7 # 80-12").waitFor();
  ok("Historial de compras y dirección guardada en la cuenta");

  await c.goto(`${BASE}/admin`);
  assert(new URL(c.url()).pathname === "/", "un cliente no entra al panel");
  ok("Un cliente que intenta entrar a /admin es devuelto a la tienda");

  // ───────────────────────────── GESTIÓN DEL PEDIDO ─────────────────────────────
  section("Gestión de pedidos desde el admin");
  await a.goto(`${BASE}/admin/pedidos/${order2.id}`);
  await a.fill('input[name="reference"]', "TRX-PRUEBA-001");
  await a.getByRole("button", { name: "Registrar pago recibido" }).click();
  // Al quedar pagado, el panel "Registrar pago" se reemplaza por "Reembolso".
  await a.getByRole("heading", { name: "Reembolso" }).waitFor();
  let o2 = await db.order.findUnique({ where: { id: order2.id } });
  assert(o2.paymentStatus === "PAID" && o2.status === "CONFIRMED", "pago registrado → Pagado + Confirmado");
  ok("Pago de la transferencia registrado manualmente con referencia");

  await a.reload();
  await a.fill('input[name="carrier"]', "Transportadora de prueba");
  await a.fill('input[name="trackingNumber"]', "GUIA-123456");
  await a.getByRole("button", { name: "Guardar envío" }).click();
  await a.getByText("Información de envío guardada.").waitFor();
  o2 = await db.order.findUnique({ where: { id: order2.id } });
  assert(o2.status === "SHIPPED" && o2.trackingNumber === "GUIA-123456", "pedido enviado con guía");
  ok("Envío registrado (transportadora + guía) y pedido marcado como Enviado");
  await shot(a, "admin-pedido", true);

  await c.goto(`${BASE}/cuenta/pedidos/${o2.number}`);
  await c.getByText("GUIA-123456").waitFor();
  ok("El cliente ve el seguimiento y la guía en su cuenta");

  await a.goto(`${BASE}/admin/pedidos/${order1.id}`);
  await a.selectOption('select[name="status"]', "CANCELLED");
  await a.fill('input[name="note"]', "Cliente desistió (prueba)");
  await a.getByRole("button", { name: "Actualizar estado" }).click();
  await a.getByText("Este pedido está en un estado final.").waitFor();
  const vA3 = await db.productVariant.findUnique({ where: { id: productA.variants[0].id } });
  const coupon2 = await db.coupon.findUnique({ where: { code: COUPON } });
  const movs = await db.inventoryMovement.findMany({ where: { orderId: order1.id }, orderBy: { createdAt: "asc" } });
  assert(vA3.stock === 2, `cancelar devuelve 2 unidades (stock ${vA3.stock})`);
  assert(coupon2.usedCount === 0, "cancelar libera el uso del cupón");
  assert(movs.map((m) => m.reason).join() === "ORDER,ORDER_CANCELLED", "movimientos de inventario registrados");
  ok("Cancelación: stock devuelto (0→2), cupón liberado, movimientos auditados");

  await g.goto(`${BASE}/seguimiento?pedido=ACMA-${String(order1.number).padStart(6, "0")}&correo=invitado-${RUN}@example.com`);
  await g.getByText("Este pedido fue cancelado.").waitFor();
  await g.goto(`${BASE}/seguimiento?pedido=ACMA-${String(order1.number).padStart(6, "0")}&correo=otro@example.com`);
  await g.getByText("No encontramos un pedido").waitFor();
  ok("Seguimiento de invitado por número + correo (y rechazo con correo incorrecto)");

  // ───────────────────────────── SEGURIDAD Y CUENTAS ─────────────────────────────
  section("Seguridad, roles y recuperación de contraseña");
  const token = randomBytes(32).toString("base64url");
  const cust = await db.user.findUnique({ where: { email: custEmail } });
  await db.passwordResetToken.create({
    data: { userId: cust.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600_000) },
  });
  const r = await (await browser.newContext()).newPage();
  await r.goto(`${BASE}/cuenta/restablecer?token=${token}`);
  await r.fill('input[name="password"]', "NuevaClave456");
  await r.fill('input[name="confirmPassword"]', "NuevaClave456");
  await r.getByRole("button", { name: "Guardar contraseña" }).click();
  await r.waitForURL(/restablecida=1/);
  await login(r, custEmail, "NuevaClave456");
  assert(new URL(r.url()).pathname === "/cuenta", "login con la nueva contraseña");
  await r.goto(`${BASE}/cuenta/restablecer?token=${token}`);
  await r.getByText("no es válido o ya expiró").waitFor();
  await c.goto(`${BASE}/cuenta`);
  assert(c.url().includes("/cuenta/ingresar"), "las sesiones anteriores se cierran al restablecer");
  ok("Restablecer contraseña: enlace de un solo uso y cierre de sesiones anteriores");

  await a.goto(`${BASE}/admin/usuarios`);
  await a.fill('input[name="email"]', custEmail);
  await a.getByRole("button", { name: "Dar acceso" }).click();
  await a.getByText("ahora es operador").waitFor();
  await login(r, custEmail, "NuevaClave456");
  await r.goto(`${BASE}/admin/productos`);
  assert(new URL(r.url()).pathname === "/admin/productos", "el operador gestiona productos");
  await r.goto(`${BASE}/admin/configuracion`);
  await r.waitForURL(/sin-permiso/);
  ok("Rol Operador: accede a productos, pero no a configuración");

  const wh1 = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", body: "{}" });
  const wh2 = await fetch(`${BASE}/api/webhooks/mercadopago`, { method: "POST", body: "{}" });
  assert(wh1.status === 503 && wh2.status === 503, "webhooks sin credenciales responden 503");
  const cron1 = await fetch(`${BASE}/api/cron/expire-orders`);
  assert(cron1.status === 401, "cron sin token → 401");
  if (CRON_SECRET) {
    const cron2 = await fetch(`${BASE}/api/cron/expire-orders`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
    assert(cron2.status === 200, "cron con token → 200");
  }
  ok("Webhooks sin credenciales → 503; tarea programada protegida por token");

  await a.goto(`${BASE}/admin`);
  await shot(a, "admin-dashboard", true);
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert(sitemap.includes(`/producto/${productA.slug}`), "el producto aparece en el sitemap");
  const productHtml = await (await fetch(`${BASE}/producto/${productA.slug}`)).text();
  assert(productHtml.includes('"@type":"Product"') && productHtml.includes('property="og:image"'), "JSON-LD de producto y Open Graph");
  ok("SEO: producto en sitemap.xml, JSON-LD Product y og:image");

  await g.goto(BASE);
  await g.locator("#catalogo").getByRole("tab", { name: new RegExp(`^Cascos ${RUN}`) }).click();
  await g.locator("#catalogo-panel").getByText(`Casco Integral Pro ${RUN}`).waitFor();
  ok("Pestañas del catálogo en la portada: filtran por categoría al instante");

  const feed = await (await fetch(`${BASE}/feeds/productos.xml`)).text();
  assert(feed.includes(`/producto/${productA.slug}`), "el producto está en el feed");
  assert(feed.includes("<g:price>420000.00 COP</g:price><g:sale_price>350000.00 COP</g:sale_price>"), "precio y precio de oferta en el feed");
  ok("Feed de productos para Google Merchant / Meta con precio y oferta");

  console.log(`\n✅ ${n} verificaciones superadas. Capturas en ${SHOTS}`);
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await db.$disconnect();
}
