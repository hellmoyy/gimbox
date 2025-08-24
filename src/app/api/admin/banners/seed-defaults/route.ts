import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { defaultBanners } from "../../../../../lib/banners";

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
  return Response.redirect('/admin/banners');
    }
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect('/admin/banners');
}
