import { NextRequest } from "next/server";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";

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

  const update: any = {
    name: String(form.get("name") || ""),
    code: String(form.get("code") || ""),
    icon: String(form.get("icon") || ""),
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
