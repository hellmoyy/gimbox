import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

function buildRedirectUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}${path}`;
  return new URL(path, req.url).toString();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  if (form.get("_method") === "DELETE") {
    try {
      const db = await getDb();
      await db.collection("promos").deleteOne({ _id: new ObjectId(id) });
    } catch (e: any) {
      const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
      return Response.json({ error: msg }, { status: 400 });
    }
  return Response.redirect(buildRedirectUrl(req, '/admin/promos'));
  }

  const update: any = {
    title: String(form.get("title") || ""),
    desc: String(form.get("desc") || ""),
    tag: String(form.get("tag") || ""),
    until: String(form.get("until") || ""),
  image: String(form.get("image") || ""),
  url: String(form.get("url") || ""),
    isActive: form.get("isActive") === "on",
  };
  try {
    const db = await getDb();
    await db.collection("promos").updateOne({ _id: new ObjectId(id) }, { $set: update });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.redirect(buildRedirectUrl(req, '/admin/promos'));
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    await db.collection("promos").deleteOne({ _id: new ObjectId(id) });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
