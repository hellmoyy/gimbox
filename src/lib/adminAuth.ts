import crypto from "crypto";
import type { NextRequest } from "next/server";
import { AUTH_SECRET as CFG_AUTH } from "./runtimeConfig";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return {
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  };
}

export function verifyPassword(password: string, saltB64: string, hashB64: string) {
  try {
    const salt = Buffer.from(saltB64, "base64");
    const derived = crypto.scryptSync(password, salt, 64);
    const target = Buffer.from(hashB64, "base64");
    return crypto.timingSafeEqual(derived, target);
  } catch {
    return false;
  }
}

// Unified admin guard check used by API routes
export function ensureAdminRequest(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  return !!cookie && cookie === guard;
}
