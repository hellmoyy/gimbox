import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

export async function POST(req: NextRequest) {
  const { email, pass } = await req.json();
  const ok = email === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
  if (!ok) return Response.json({ success: false, message: "Email/password salah" }, { status: 401 });
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  (await cookies()).set("admin_session", guard, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return Response.json({ success: true });
}
