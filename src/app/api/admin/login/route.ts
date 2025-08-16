import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";
import { getDb } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { email, pass } = await req.json();
  const lower = String(email || '').toLowerCase();

  // 1) Try DB-backed admin
  try {
    const db = await getDb();
    const admin = await db.collection('admins').findOne({ email: lower });
    if (admin && verifyPassword(String(pass || ''), admin.salt, admin.hash)) {
      const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
      (await cookies()).set("admin_session", guard, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
      return Response.json({ success: true });
    }
  } catch {}

  // 2) Fallback to env-based admin
  const ok = lower === String(process.env.ADMIN_USER || '').toLowerCase() && pass === process.env.ADMIN_PASS;
  if (!ok) return Response.json({ success: false, message: "Email/password salah" }, { status: 401 });
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  (await cookies()).set("admin_session", guard, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return Response.json({ success: true });
}
