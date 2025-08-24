import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const brandKey = String(form.get("brandKey") || "").trim();
  if (!brandKey) return Response.json({ error: "brandKey required" }, { status: 400 });
  let rawCode = String(form.get("code") || "").trim();
  if (!rawCode) rawCode = slugify(name);
  // final code pattern brandKey-rawCode (lowercase)
  const code = `${brandKey}-${slugify(rawCode)}`.toLowerCase();
  const doc: any = {
    name,
    code,
    brandKey,
    gameCode: brandKey,
    category: brandKey,
    categories: [brandKey, 'semua-produk'],
    isActive: form.get("isActive") === "on",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const variantsRaw = form.get("variants");
  if (typeof variantsRaw === "string") {
    try {
      const parsed = JSON.parse(variantsRaw);
      if (Array.isArray(parsed)) doc.variants = parsed.map((v: any) => ({
        label: String(v.label || ""),
        sku: v.sku ? String(v.sku) : undefined,
        cost: v.cost === null || v.cost === undefined ? null : Number(v.cost),
        price: v.price === null || v.price === undefined ? null : Number(v.price),
        compareAt: v.compareAt === null || v.compareAt === undefined ? null : Number(v.compareAt),
        icon: v.icon ? String(v.icon) : undefined,
        region: v.region ? String(v.region) : undefined,
        isActive: (v.isActive ?? true) !== false,
      }));
    } catch {}
  }
  try {
    const db = await getDb();
    // Ensure universal category exists
    try { await db.collection('categories').updateOne({ code: 'semua-produk' }, { $set: { code: 'semua-produk', name: 'Semua Produk', isActive: true } }, { upsert: true }); } catch {}
    await db.collection("products").insertOne(doc);
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(new URL(`/admin/products?created=1&brand=${encodeURIComponent(doc.brandKey)}`, req.url));
}
