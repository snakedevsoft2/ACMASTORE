# ACMA STORE — Tienda online

**TODO EN UN SOLO LUGAR.** Plataforma de comercio electrónico con catálogo, carrito, checkout, pagos, pedidos, inventario, cuentas de cliente y panel de administración.

- Arquitectura, modelo de datos y decisiones técnicas: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Stack: Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 6

---

## 1. Puesta en marcha local

Requisitos: Node.js 20 o superior y Docker Desktop.

```bash
cp .env.example .env          # define ADMIN_EMAIL y ADMIN_PASSWORD (mín. 10 caracteres)
npm install
npm run db:up                 # PostgreSQL en Docker (puerto 5433)
npm run db:deploy             # aplica las migraciones
npm run db:seed               # configuración inicial + usuario administrador
npm run dev                   # http://localhost:3000
```

El seed **no crea productos, pedidos, clientes ni testimonios**: solo crea el administrador, los ajustes de la tienda, los cuatro métodos de pago (inactivos) y las páginas del footer con texto provisional.

Ingresa en `http://localhost:3000/cuenta/ingresar` con `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Serás redirigido al panel `/admin`.

## 2. Antes de abrir la tienda

El dashboard muestra una lista **"Antes de vender"**. En orden:

1. **Configuración → Tienda:** logotipo, datos de contacto, WhatsApp, redes sociales, moneda (por defecto COP / es-CO) y analítica.
2. **Categorías** y **Productos:** fotos, precios, precio anterior (descuento), variantes (talla, color, modelo) y stock.
3. **Métodos de envío:** al menos uno, con su tarifa y, opcionalmente, el monto para envío gratis.
4. **Métodos de pago:** activa los que ofrecerás (ver sección 3).
5. **Páginas:** redacta Nosotros, Contacto, Preguntas frecuentes y las cuatro políticas. Mientras tengan el texto provisional, no se indexan en buscadores. Los textos legales deben reflejar las condiciones reales del negocio y la normativa aplicable.
6. **Correo SMTP** (variables de entorno): sin él no se envían confirmaciones de pedido ni enlaces de recuperación de contraseña.

## 2.1 Catálogo, WhatsApp y publicidad

**Catálogo inicial.** Los productos de `imagenes de catalogo/` están descritos en `prisma/catalogo/catalogo-inicial.json` (nombre, categoría, precio, precio anterior y fotos, tomados de cada imagen). Para cargarlos en una base de datos:

```bash
npm run db:import-catalog
```

Es idempotente: no duplica productos existentes. Con `BLOB_READ_WRITE_TOKEN` definido sube las fotos a Vercel Blob; úsalo así para cargar el catálogo en producción (con `DATABASE_URL` de producción). Los productos se crean **sin control de inventario** (siempre disponibles) porque las fotos no indican existencias; para llevar stock, marca "Controlar inventario" en cada producto.

**WhatsApp.** Al definir el número en *Configuración → Tienda → WhatsApp de ventas* se activan: el botón flotante de asesoría, "Separar por WhatsApp" en tarjetas y fichas (con producto, opción, cantidad, precio y enlace), "Pedir asesoría" y "Enviar pedido por WhatsApp" en el carrito. Sin número, esos botones no se muestran.

**Redes sociales.** Instagram, Facebook, TikTok, X y YouTube se configuran en *Configuración → Tienda*; aparecen en la portada ("Síguenos"), el menú del celular, el footer y la página de contacto.

**Publicidad y SEO.**

- *Meta Pixel* (Facebook/Instagram Ads) y *Google Analytics 4 / Google Ads*: IDs en *Configuración*. Eventos: vista de producto, agregar al carrito, inicio de pago, compra, búsqueda y contacto por WhatsApp. Respetan el aviso de cookies.
- *Feed de productos* para Google Merchant Center (Shopping) y Meta Commerce Manager (catálogo y anuncios dinámicos): `https://TU-DOMINIO/feeds/productos.xml`.
- Verificación de dominio de Google y Meta, título y descripción SEO: en *Configuración*.
- Cada producto publica precio, disponibilidad y oferta en datos estructurados (JSON-LD) y etiquetas Open Graph de producto; las categorías incluyen cantidad y precio desde.

## 3. Pagos

| Método | Tipo | Cómo se confirma |
|---|---|---|
| Mercado Pago (Checkout Pro) | En línea | Webhook `/api/webhooks/mercadopago`; el estado se consulta a la API de Mercado Pago |
| Stripe Checkout | En línea | Webhook firmado `/api/webhooks/stripe` |
| Transferencia bancaria | Manual | El administrador registra el pago con su referencia desde el pedido |
| Contra entrega | Manual | El administrador registra el pago al recibirlo |

- Un método **en línea** solo aparece al cliente si está activo en el admin **y** tiene credenciales en el servidor. Sin credenciales, el panel no permite activarlo.
- Un pedido **nunca** se marca como pagado por volver de la pasarela: solo por el webhook verificado, que además comprueba el monto y la moneda.
- El sistema no almacena datos de tarjetas; el cliente paga en la página de la pasarela.

**Stripe:** define `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`. En el panel de Stripe crea un endpoint hacia `https://TU-DOMINIO/api/webhooks/stripe` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. En local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

**Mercado Pago:** define `MERCADOPAGO_ACCESS_TOKEN` y, recomendado, `MERCADOPAGO_WEBHOOK_SECRET` (firma de notificaciones). Configura las notificaciones de **Pagos** hacia `https://TU-DOMINIO/api/webhooks/mercadopago`. Mercado Pago exige una URL pública con HTTPS, así que el flujo completo se prueba en un entorno publicado o con un túnel.

**Pedidos sin pagar:** las unidades de un pedido con pago en línea quedan reservadas `PENDING_ORDER_TTL_HOURS` (24 h por defecto). Programa cada hora:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://TU-DOMINIO/api/cron/expire-orders
```

También puedes ejecutarlo a mano desde **Pedidos → Liberar pedidos vencidos**.

## 4. Despliegue en Vercel

El proyecto ya está preparado para Vercel (`vercel.json`, `.vercelignore` y el script `vercel-build`). Cada despliegue **aplica las migraciones y la configuración inicial antes de compilar**.

> **Plan:** el plan Hobby de Vercel es solo para uso personal no comercial. Una tienda en operación necesita el plan **Pro**.

**1. Crear los servicios** (panel de Vercel → *Storage*):

- **Neon (Postgres)**, región *Washington, D.C. (us-east-1)*, la misma de las funciones de Vercel. Al conectarla al proyecto crea `DATABASE_URL` (con pooling) y `DATABASE_URL_UNPOOLED` (directa, para migraciones).
- **Blob**: al conectarlo crea `BLOB_READ_WRITE_TOKEN`. Las fotos se guardan ahí; el disco de Vercel es temporal.

**2. Importar el proyecto:** sube el código a un repositorio privado de GitHub y en Vercel usa *Add New → Project*. También puedes desplegar desde esta carpeta con Vercel CLI (`npx vercel`).

**3. Variables de entorno** (*Settings → Environment Variables*, entorno *Production*):

| Variable | Valor |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Crean el administrador en el primer despliegue. Después puedes borrarlas. |
| `CRON_SECRET` | Texto aleatorio largo. Vercel lo envía a la tarea programada. |
| `STORE_TIMEZONE` | `America/Bogota` |
| `NEXT_PUBLIC_SITE_URL` | Tu dominio con `https://`. Opcional al inicio: si falta, se usa el dominio `.vercel.app` del proyecto. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ORDER_NOTIFICATION_EMAIL` | Correo transaccional. |
| `STRIPE_*`, `MERCADOPAGO_*` | Cuando actives cada pasarela (sección 3). |

`DATABASE_URL`, `DATABASE_URL_UNPOOLED` y `BLOB_READ_WRITE_TOKEN` las crea Vercel al conectar Neon y Blob. **No subas el archivo `.env`**: `.vercelignore` lo excluye.

**4. Desplegar.** Si el primer despliegue falla porque la base aún no estaba conectada, conéctala y usa *Redeploy*.

**5. Dominio propio** (*Settings → Domains*): agrégalo, define `NEXT_PUBLIC_SITE_URL` con ese dominio, vuelve a desplegar y apunta los webhooks de Stripe y Mercado Pago a él.

Notas:

- **Tarea programada:** `vercel.json` libera los pedidos vencidos una vez al día (06:00 UTC), el máximo que permite el plan Hobby. En Pro puedes cambiarla a cada hora (`"0 * * * *"`).
- **Fotos:** se comprimen en el navegador antes de subirse, porque Vercel limita cada petición a 4,5 MB. Probado con una foto de 9,7 MB.
- **Límite de intentos** (login, registro, pedidos): vive en la memoria de cada instancia. En Vercel cada función tiene la suya, así que la protección es parcial; para reforzarla, usar Upstash Redis.

### Servidor propio (alternativa)

```bash
npm ci && npm run db:deploy && npm run build && npm start
```

Sin `BLOB_READ_WRITE_TOKEN`, las fotos se guardan en `UPLOAD_DIR`: usa un volumen persistente.

## 5. Pruebas

```bash
npm run typecheck
npm test                      # pruebas unitarias: precios, cupones, dinero, firma de webhooks
```

**Punta a punta** (`tests/e2e/flujo-compra.mjs`, usa Microsoft Edge instalado): recorre admin, catálogo, carrito, cupón, checkout como invitado y como cliente, dos compras simultáneas de la última unidad, gestión del pedido, cancelación con devolución de stock, recuperación de contraseña, roles y webhooks.

> ⚠ Crea datos de prueba. Úsala **solo con una base de datos de pruebas** (el script se niega a correr si el nombre de la base no contiene `test` o `e2e`).

```bash
# Una vez: base de pruebas y archivo .env.e2e (copia de .env con DATABASE_URL → acma_store_test,
# NEXT_PUBLIC_SITE_URL → http://localhost:3100, UPLOAD_DIR → ./storage/uploads-test)
docker compose exec db psql -U acma -c "CREATE DATABASE acma_store_test;"
set -a; . ./.env.e2e; set +a
npx prisma migrate deploy && npx tsx prisma/seed.ts
npm run build && npx next start -p 3100 &
E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

## 6. Estado y pendientes conocidos

Verificado: build de producción con el mismo comando que usa Vercel, 39 pruebas unitarias y 36 verificaciones de punta a punta (ver sección 5).

No verificado todavía, por falta de credenciales:

- **Stripe y Mercado Pago contra sus entornos sandbox.** El código, la verificación de firmas y el bloqueo sin credenciales están probados; el cobro real no.
- **Vercel Blob y Neon en un despliegue real.** El código está listo y el modo local está probado; falta el primer despliegue con tus cuentas.
- **Envío de correos por SMTP.** Sin SMTP, en desarrollo los correos se imprimen en la consola del servidor.

Fuera del alcance actual:

- Los reembolsos se ejecutan en la pasarela y se **registran** en el pedido; el sistema no mueve dinero. Stripe no sincroniza reembolsos automáticamente (Mercado Pago sí los informa por webhook).
- No se calculan impuestos por separado: los precios se publican con impuestos incluidos.
- El contenido de las páginas legales debe redactarlo el negocio.
