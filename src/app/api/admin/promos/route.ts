import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
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
    title: String(form.get("title") || ""),
    desc: String(form.get("desc") || ""),
    tag: String(form.get("tag") || ""),
    until: String(form.get("until") || ""),
  image: String(form.get("image") || ""),
  url: String(form.get("url") || ""),
    isActive: form.get("isActive") === "on",
    createdAt: new Date(),
  };
  try {
    const db = await getDb();
    await db.collection("promos").insertOne(doc);
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(buildRedirectUrl(req, '/admin/promos'));
}
