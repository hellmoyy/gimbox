import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, pass } = await req.json();
  const ok = email === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
  if (!ok) return Response.json({ success: false, message: "Email/password salah" }, { status: 401 });
  (await cookies()).set("admin_session", process.env.AUTH_SECRET || "dev", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return Response.json({ success: true });
}
