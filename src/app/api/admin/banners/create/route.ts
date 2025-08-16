import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const doc: any = {
    image: String(form.get("image") || ""),
    link: String(form.get("link") || ""),
    isActive: form.get("isActive") === "on",
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
  return Response.redirect(new URL("/admin/banners", req.url));
}
