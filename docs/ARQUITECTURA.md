# ACMA STORE — Arquitectura

Documento de referencia técnica. Define el stack, la estructura del proyecto, el modelo de datos y los módulos.

## 1. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | SSR/SSG para SEO, Server Actions, un solo despliegue para tienda + admin |
| Estilos | **Tailwind CSS 4** con tokens de marca | Paleta ACMA centralizada en `globals.css` |
| Base de datos | **PostgreSQL 16** | Relacional, transaccional (inventario y pedidos) |
| ORM | **Prisma 6** | Esquema tipado, migraciones versionadas |
| Autenticación | Sesiones propias en BD (cookie httpOnly + token hasheado SHA-256), contraseñas con **bcrypt** | Control total, revocables, sin dependencias beta |
| Validación | **Zod** | Mismo esquema en servidor para formularios y acciones |
| Pagos | Capa `PaymentProvider` con adaptadores **Stripe Checkout**, **Mercado Pago Checkout Pro** y métodos manuales (transferencia, contra entrega) | Pasarela configurable; nunca se toca la tarjeta |
| Imágenes | `sharp` (redimensiona y convierte a WebP) + `next/image` | Fotografías optimizadas |
| Correo | `nodemailer` (SMTP por variables de entorno) | Recuperación de contraseña, confirmaciones |
| Analítica | GA4 + Google Ads (gtag), eventos de e-commerce | Medición de conversiones |

## 2. Estructura

```
prisma/              schema.prisma, migraciones, seed.ts
src/
  app/
    (store)/         Tienda pública: inicio, tienda, producto, carrito, checkout, cuenta, páginas
    admin/           Panel privado (ADMIN / STAFF)
    api/             Webhooks de pagos, tareas programadas
    uploads/         Entrega de imágenes subidas
    sitemap.ts, robots.ts
  components/        ui/ (base), store/ (tienda), admin/ (panel)
  lib/
    auth/            sesiones, contraseñas, permisos
    payments/        proveedores de pago
    db.ts, settings.ts, pricing.ts, cart.ts, orders.ts, inventory.ts,
    storage.ts, email.ts, money.ts, seo.ts, validation.ts
  middleware.ts      Protección optimista de /admin y /cuenta
storage/uploads/     Imágenes subidas (fuera de git)
```

## 3. Modelo de datos

```
User ─┬─ Session            (sesiones activas, token hasheado)
      ├─ PasswordResetToken (un solo uso, 1 h)
      ├─ Address            (direcciones del cliente)
      ├─ Cart ── CartItem ── ProductVariant
      └─ Order

Category (jerárquica: parentId) ── Product ─┬─ ProductImage
                                             ├─ ProductOption   (ej. "Talla": [S, M, L])
                                             └─ ProductVariant  (stock, SKU, precio propio opcional)

Order ─┬─ OrderItem           (copia del nombre, SKU y precio al momento de compra)
       ├─ OrderStatusHistory  (trazabilidad de cada cambio de estado)
       └─ PaymentTransaction  (registro de cada evento de la pasarela)

InventoryMovement   (cada entrada/salida de stock con motivo)
ShippingMethod, PaymentMethodConfig, Coupon, StoreSettings (singleton),
Page (Nosotros, FAQ, políticas…), Testimonial
```

Decisiones clave:

- **Dinero en enteros (centavos).** Evita errores de coma flotante. Moneda y locale en `StoreSettings`.
- **Todo producto tiene al menos una variante.** El stock vive en la variante; un producto "simple" tiene una variante por defecto.
- **El pedido guarda una copia** de nombre, SKU, precio y dirección. Editar o borrar un producto no altera pedidos históricos.
- **Inventario atómico:** al confirmar un pedido se descuenta con `UPDATE … WHERE stock >= cantidad` dentro de una transacción. Si una variante no alcanza, el pedido completo se revierte. Cancelar un pedido devuelve el stock. Cada cambio queda en `InventoryMovement`.
- **El servidor recalcula todo.** El navegador nunca envía precios: subtotal, descuentos, envío y total salen de la BD.

## 4. Estados

| Pedido (`OrderStatus`) | Pago (`PaymentStatus`) |
|---|---|
| PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED | PENDING → PAID |
| CANCELLED (devuelve stock) | FAILED, REFUNDED |

Un pago en línea solo pasa a `PAID` cuando el **webhook verificado** de la pasarela lo confirma (firma Stripe / consulta a la API de Mercado Pago). La página de retorno nunca marca un pedido como pagado. Los métodos manuales quedan en `PENDING` hasta que el administrador registre el pago.

## 5. Módulos

1. **Catálogo:** categorías, productos, variantes, imágenes, búsqueda, filtros, orden.
2. **Carrito:** en BD, identificado por cookie (invitado) o usuario; se fusiona al iniciar sesión.
3. **Checkout:** datos → dirección → envío → pago → confirmación. Compra como invitado.
4. **Pagos:** `PaymentProvider` (`createPayment`, `handleWebhook`). Las credenciales solo existen en variables de entorno.
5. **Pedidos:** numeración `ACMA-000001`, historial de estados, envío (transportadora y guía), seguimiento.
6. **Cuentas:** registro, login, recuperación, perfil, direcciones, historial.
7. **Administración:** dashboard, productos, categorías, inventario, pedidos, clientes, configuración, cupones, páginas, testimonios.
8. **SEO y marketing:** metadatos, Open Graph, JSON-LD, sitemap, robots, GA4, Google Ads.

## 6. Seguridad

- Contraseñas con bcrypt (coste 12). Los tokens de sesión y recuperación se guardan hasheados.
- Cookies `httpOnly`, `SameSite=Lax`, `Secure` en producción.
- Roles `ADMIN`, `STAFF` y `CUSTOMER`. El middleware redirige pronto y cada página y acción del admin vuelve a verificar el rol en el servidor.
- Server Actions con verificación de origen (Next.js) y validación Zod en cada entrada.
- Límite de intentos en login, registro y recuperación.
- Webhooks con verificación de firma. Sin datos de tarjeta en el sistema.
- Cabeceras de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Subidas: solo imágenes, tamaño máximo, re-codificadas con sharp y nombre aleatorio.

## 7. Etapas de desarrollo

1. Base: proyecto, BD, esquema, seed de configuración (sin productos ni ventas ficticias).
2. Autenticación y cuentas.
3. Tienda: layout, inicio, catálogo, ficha de producto.
4. Carrito, checkout, pedidos, inventario y pagos.
5. Panel de administración.
6. SEO y analítica.
7. Verificación: build, pruebas unitarias y recorrido de punta a punta.
