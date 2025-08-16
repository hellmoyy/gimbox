import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export type Category = { _id: ObjectId; name: string; code?: string; icon?: string; isActive?: boolean; sort?: number };

export async function getCategories(filter: any = {}) {
  const db = await getDb();
  const items = await db
    .collection("categories")
    .find({ isActive: { $ne: false }, ...filter })
    .project({ name: 1, code: 1, icon: 1, sort: 1 })
    .sort({ sort: 1, name: 1 })
    .toArray();
  return items as Category[];
}

export async function getCategoryMap() {
  const list = await getCategories();
  const map = new Map<string, Category>();
  for (const c of list) map.set(c._id.toString(), c);
  return map;
}
