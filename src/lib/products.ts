import { getDb } from "./mongodb";

export async function getProducts(filter: any = {}) {
  try {
    const db = await getDb();
    const items = await db
      .collection("products")
      .find({ isActive: { $ne: false }, ...filter })
  .project({ name: 1, code: 1, icon: 1, category: 1, categories: 1, featured: 1, price: 1, cost: 1 })
      .sort({ featured: -1, name: 1 })
      .toArray();
    return items as any[];
  } catch (e) {
    console.warn("[lib/products] getProducts DB error:", (e as any)?.message || e);
    return [] as any[];
  }
}

export async function getProductByCode(code: string) {
  try {
    const db = await getDb();
    return db.collection("products").findOne({ code });
  } catch (e) {
    console.warn("[lib/products] getProductByCode DB error:", (e as any)?.message || e);
    return null as any;
  }
}
