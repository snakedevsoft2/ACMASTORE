/**
 * Build de producción (Vercel): genera el cliente de Prisma, aplica migraciones,
 * carga la configuración inicial (idempotente) y compila Next.js.
 */
import { normalizeDbEnv, run } from "./db-env.mjs";

const env = normalizeDbEnv({ requireDb: true });
const host = (() => {
  try {
    return new URL(env.DATABASE_URL).host;
  } catch {
    return "(URL no válida)";
  }
})();
console.log(`Base de datos: ${host}`);

for (const step of ["prisma generate", "prisma migrate deploy", "tsx prisma/seed.ts", "next build"]) {
  console.log(`\n▶ ${step}`);
  const status = run(step, env);
  if (status !== 0) {
    console.error(`\n✖ Falló: ${step}`);
    process.exit(status);
  }
}
