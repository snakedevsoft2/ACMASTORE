/**
 * Normaliza las variables de base de datos para Prisma y ejecuta un comando.
 *
 * Vercel/Neon/Supabase usan nombres distintos para la misma conexión. Aquí se resuelven a:
 *   DATABASE_URL           → conexión de la aplicación (con pooling)
 *   DATABASE_URL_UNPOOLED  → conexión directa para migraciones (si falta, se usa DATABASE_URL)
 *
 * Uso: node scripts/db-env.mjs <comando>   (ej. "prisma generate")
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Solo para "prisma generate", que no se conecta a la base: evita fallar en la instalación.
const PLACEHOLDER = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

/** Carga .env local sin pisar variables ya definidas (en Vercel no existe .env). */
function loadDotEnv(env) {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in env) continue;
    env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
}

export function normalizeDbEnv({ requireDb }) {
  const env = { ...process.env };
  loadDotEnv(env);
  const first = (...names) => names.map((n) => env[n]).find((v) => typeof v === "string" && v.trim() !== "");

  const pooled = first("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "NEON_DATABASE_URL");
  const direct = first("DATABASE_URL_UNPOOLED", "DATABASE_URL_NON_POOLING", "POSTGRES_URL_NON_POOLING", "NEON_DATABASE_URL_UNPOOLED") ?? pooled;

  if (!pooled) {
    if (requireDb) {
      console.error(
        "\n✖ No se encontró la base de datos (DATABASE_URL).\n" +
          "  En Vercel: pestaña Storage → conecta la base Neon a este proyecto (Production) y vuelve a desplegar.\n",
      );
      process.exit(1);
    }
    env.DATABASE_URL = PLACEHOLDER;
    env.DATABASE_URL_UNPOOLED = PLACEHOLDER;
    return env;
  }
  env.DATABASE_URL = pooled;
  env.DATABASE_URL_UNPOOLED = direct;
  return env;
}

/** Ejecuta un comando con node_modules/.bin en el PATH (como dentro de "npm run"). */
export function run(command, env) {
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  const bin = path.resolve("node_modules", ".bin");
  const withBin = { ...env, [pathKey]: `${bin}${path.delimiter}${env[pathKey] ?? ""}` };
  const r = spawnSync(command, { stdio: "inherit", shell: true, env: withBin });
  return r.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv.slice(2).join(" ");
  if (!command) {
    console.error("Uso: node scripts/db-env.mjs <comando>");
    process.exit(1);
  }
  process.exit(run(command, normalizeDbEnv({ requireDb: false })));
}
