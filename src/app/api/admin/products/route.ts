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
    // Handle new category creation if provided
    const newCategoryName = String(form.get("newCategoryName") || "").trim();
    if (newCategoryName) {
      const code = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await db.collection("categories").updateOne(
        { code },
        { $set: { name: newCategoryName, code, isActive: true } },
        { upsert: true }
      );
      doc.category = code;
    }
    await db.collection("products").insertOne(doc);
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "DB error";
    return Response.json({ error: msg }, { status: 503 });
  }
  return Response.redirect(new URL("/admin/products", req.url));
}
