import { NextRequest } from "next/server";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { copyImageToCDN, shouldCopyRemote } from '@/lib/imageStore';

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) return false;
  return true;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();

  if (form.get("_method") === "DELETE") {
    try {
      const db = await getDb();
  await db.collection("categories").deleteOne({ _id: new ObjectId(id) });
    } catch (e: any) {
      const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.redirect(new URL("/admin/categories", req.url));
  }

  let icon = String(form.get("icon") || "").trim();
  const name = String(form.get("name") || "");
  const code = String(form.get("code") || "");
  if (icon && shouldCopyRemote(icon)) {
    const copied = await copyImageToCDN(icon, { folder: 'categories', slug: code || name });
    if (copied) icon = copied;
  }
  const update: any = {
    name,
    code,
    icon,
    sort: form.get("sort") ? Number(form.get("sort")) : undefined,
    isActive: form.get("isActive") === "on",
  };
  try {
    const db = await getDb();
  await db.collection("categories").updateOne({ _id: new ObjectId(id) }, { $set: update });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.redirect(new URL("/admin/categories", req.url));
}
