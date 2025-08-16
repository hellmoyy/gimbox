import { cookies } from "next/headers";

export async function POST() {
  // Clear the admin session cookie
  (await cookies()).set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ success: true });
}

export async function GET() {
  // Allow GET for convenience (e.g., manual testing)
  return POST();
}
