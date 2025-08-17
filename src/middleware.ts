import { NextResponse } from "next/server";
import { AUTH_SECRET as CFG_AUTH } from "./lib/runtimeConfig";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const isLoginPath = pathname === "/admin/login";
  if (isAdminPath && !isLoginPath) {
    const cookie = req.cookies.get("admin_session")?.value;
    const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
    // In production, disallow default/empty guard
    if (process.env.NODE_ENV === 'production' && (!guard || guard === 'dev')) {
      return new NextResponse("Server misconfigured: AUTH_SECRET must be set", { status: 503 });
    }
    if (!cookie || cookie !== guard) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
