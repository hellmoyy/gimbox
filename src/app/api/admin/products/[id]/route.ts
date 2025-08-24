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
  const name = String(form.get("name") || "").trim();
  const brandKey = String(form.get("brandKey") || "").trim();
  const rawCode = String(form.get("code") || "").trim();
  function slugify(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
  const finalCode = rawCode ? `${brandKey}-${slugify(rawCode)}`.toLowerCase() : undefined;
  const update: any = { name, updatedAt: new Date() };
  if (brandKey) {
    update.brandKey = brandKey; update.gameCode = brandKey; update.category = brandKey; update.categories = [brandKey,'semua-produk'];
  }
  if (finalCode) update.code = finalCode;
  const purchaseMode = String(form.get('purchaseMode') || 'user-id');
  update.purchaseMode = purchaseMode;
  const pfRaw = form.get('purchaseFields');
  if (typeof pfRaw === 'string') {
    if (pfRaw.trim()) {
      try { const parsed = JSON.parse(pfRaw); if (Array.isArray(parsed)) update.purchaseFields = parsed; } catch {}
    } else {
      update.purchaseFields = [];
    }
  }
  update.isActive = form.get("isActive") === "on";
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
  try { await db.collection('categories').updateOne({ code: 'semua-produk' }, { $set: { code: 'semua-produk', name: 'Semua Produk', isActive: true } }, { upsert: true }); } catch {}
    if (update.code) {
      const duplicate = await db.collection('products').findOne({ code: update.code, _id: { $ne: new ObjectId(id) } });
      if (duplicate) {
        return Response.json({ error: 'Kode produk sudah digunakan' }, { status: 400 });
      }
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
