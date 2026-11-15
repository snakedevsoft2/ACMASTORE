import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Acepta los nombres que usan Vercel/Neon/Supabase (incluidos prefijos personalizados).
function resolveDatabaseUrl(): string | undefined {
  const e = process.env;
  const named = e.DATABASE_URL || e.POSTGRES_PRISMA_URL || e.POSTGRES_URL;
  if (named) return named;
  const found = Object.entries(e).find(
    ([k, v]) => typeof v === "string" && /^postgres(ql)?:\/\//i.test(v) && !/UNPOOLED|NON_POOLING|DIRECT|NO_SSL/i.test(k),
  );
  return found?.[1];
}
const datasourceUrl = resolveDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
