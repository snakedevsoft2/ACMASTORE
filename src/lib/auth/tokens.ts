import { createHash, randomBytes } from "node:crypto";

/** Token aleatorio de 256 bits para cookies y enlaces. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Solo se guarda el hash: si la BD se filtra, los tokens no son reutilizables. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
