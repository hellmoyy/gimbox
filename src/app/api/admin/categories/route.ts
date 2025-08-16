import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const doc: any = {
    name: String(form.get("name") || ""),
    code: String(form.get("code") || ""),
    icon: String(form.get("icon") || ""),
    sort: form.get("sort") ? Number(form.get("sort")) : undefined,
    isActive: form.get("isActive") === "on",
  };
  try {
    const db = await getDb();
    await db.collection("categories").insertOne(doc);
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(new URL("/admin/categories", req.url));
}
