import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { defaultBanners } from "../../../../../lib/banners";

function buildRedirectUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}${path}`;
  return new URL(path, req.url).toString();
}

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    // For single-image model we don't ship defaults. Keep endpoint as no-op success.
    if (defaultBanners.length === 0) {
  return Response.redirect(buildRedirectUrl(req, '/admin/banners'));
    }
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(buildRedirectUrl(req, '/admin/banners'));
}
