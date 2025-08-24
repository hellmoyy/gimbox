import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

function buildRedirectUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}${path}`;
  return new URL(path, req.url).toString();
}

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const doc: any = {
    image: String(form.get("image") || ""),
    link: String(form.get("link") || ""),
    isActive: form.get("isActive") === "on",
    // Optional responsive variants (comma separated) coming from upload response
    variants: (String(form.get("variants") || "")
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean)) || [],
  };
  const sortRaw = form.get("sort");
  if (typeof sortRaw === "string" && sortRaw !== "") doc.sort = Number(sortRaw);
  if (!doc.image) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }
  try {
    const db = await getDb();
    await db.collection("banners").insertOne(doc);
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(buildRedirectUrl(req, '/admin/banners'));
}
