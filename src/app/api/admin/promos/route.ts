import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
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
  return Response.redirect(new URL("/admin/promos", req.url));
}
