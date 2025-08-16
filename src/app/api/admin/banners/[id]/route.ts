import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) return false;
  return true;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  if (form.get("_method") === "DELETE") {
    try {
      const db = await getDb();
      await db.collection("banners").deleteOne({ _id: new ObjectId(params.id) });
    } catch (e: any) {
      const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.redirect(new URL("/admin/banners", req.url));
  }

  const update: any = {
    image: String(form.get("image") || ""),
    link: String(form.get("link") || ""),
    isActive: form.get("isActive") === "on",
  };
  const sortRaw = form.get("sort");
  if (typeof sortRaw === "string" && sortRaw !== "") update.sort = Number(sortRaw);
  if (!update.image) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.collection("banners").updateOne({ _id: new ObjectId(params.id) }, { $set: update });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.redirect(new URL("/admin/banners", req.url));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    await db.collection("banners").deleteOne({ _id: new ObjectId(params.id) });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
