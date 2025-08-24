import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { copyImageToCDN, shouldCopyRemote } from '@/lib/imageStore';
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  let icon = String(form.get("icon") || "").trim();
  const name = String(form.get("name") || "");
  const code = String(form.get("code") || "");
  if (icon && shouldCopyRemote(icon)) {
    const copied = await copyImageToCDN(icon, { folder: 'categories', slug: code || name });
    if (copied) icon = copied;
  }
  const doc: any = {
    name,
    code,
    icon,
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
