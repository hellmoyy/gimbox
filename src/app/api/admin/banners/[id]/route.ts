import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  if (form.get("_method") === "DELETE") {
    try {
      const db = await getDb();
      await db.collection("banners").deleteOne({ _id: new ObjectId(id) });
    } catch (e: any) {
      const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
      return Response.json({ error: msg }, { status: 400 });
    }
  return Response.redirect('/admin/banners');
  }

  const update: any = {
    image: String(form.get("image") || ""),
    link: String(form.get("link") || ""),
    isActive: form.get("isActive") === "on",
    variants: (String(form.get("variants") || "")
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean)) || [],
  };
  const sortRaw = form.get("sort");
  if (typeof sortRaw === "string" && sortRaw !== "") update.sort = Number(sortRaw);
  if (!update.image) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.collection("banners").updateOne({ _id: new ObjectId(id) }, { $set: update });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.redirect('/admin/banners');
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    await db.collection("banners").deleteOne({ _id: new ObjectId(id) });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
