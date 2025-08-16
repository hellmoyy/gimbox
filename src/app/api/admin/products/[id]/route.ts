import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../lib/mongodb";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Using POST for HTML form compatibility
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  // Method override for DELETE via HTML form
  if (form.get("_method") === "DELETE") {
    try {
      const db = await getDb();
      await db.collection("products").deleteOne({ _id: new ObjectId(id) });
    } catch (e: any) {
      const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.redirect(new URL("/admin/products", req.url));
  }
  const update: any = {
    name: String(form.get("name") || ""),
    code: String(form.get("code") || ""),
    icon: String(form.get("icon") || ""),
    category: String(form.get("category") || "game"),
    featured: form.get("featured") === "on",
  newRelease: form.get("newRelease") === "on",
  voucher: form.get("voucher") === "on",
  pulsaTagihan: form.get("pulsaTagihan") === "on",
  entertainment: form.get("entertainment") === "on",
    isActive: form.get("isActive") === "on",
  };
  const variantsRaw = form.get("variants");
  if (typeof variantsRaw === "string") {
    try {
      const parsed = JSON.parse(variantsRaw);
      if (Array.isArray(parsed)) update.variants = parsed.map((v: any) => ({
        label: String(v.label || ""),
        sku: v.sku ? String(v.sku) : undefined,
        cost: v.cost === null || v.cost === undefined ? null : Number(v.cost),
        price: v.price === null || v.price === undefined ? null : Number(v.price),
        compareAt: v.compareAt === null || v.compareAt === undefined ? null : Number(v.compareAt),
        icon: v.icon ? String(v.icon) : undefined,
        region: v.region ? String(v.region) : undefined,
        isActive: (v.isActive ?? true) !== false,
      }));
    } catch {
      // ignore invalid JSON
    }
  }
  try {
    const db = await getDb();
    // Handle new category creation
    const newCategoryName = String(form.get("newCategoryName") || "").trim();
    if (newCategoryName) {
      const code = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await db.collection("categories").updateOne(
        { code },
        { $set: { name: newCategoryName, code, isActive: true } },
        { upsert: true }
      );
      update.category = code;
    }
    await db.collection("products").updateOne({ _id: new ObjectId(id) }, { $set: update });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.redirect(new URL("/admin/products", req.url));
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    await db.collection("products").deleteOne({ _id: new ObjectId(id) });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
