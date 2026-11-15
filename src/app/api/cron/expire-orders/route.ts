import { timingSafeEqual } from "node:crypto";
import { expireStalePendingOrders } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Libera el stock de pedidos con pago en línea que nunca se completaron.
 * Programar cada hora: GET /api/cron/expire-orders con "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET no configurado", { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("No autorizado", { status: 401 });

  const cancelled = await expireStalePendingOrders();
  return Response.json({ ok: true, cancelled });
}
