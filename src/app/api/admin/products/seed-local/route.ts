import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { featured, vouchers, allGames } from "../../../../../lib/homeData.local";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();

  // Build unique map by code
  const map = new Map<string, any>();
  (allGames as readonly any[]).forEach((item: any) => {
    map.set(item.code, { ...item, category: "game", featured: false });
  });
  (vouchers as readonly any[]).forEach((item: any) => {
    const prev = map.get(item.code) || {};
    map.set(item.code, { ...prev, ...item, category: "voucher" });
  });
  (featured as readonly any[]).forEach((item: any) => {
    const prev = map.get(item.code) || {};
    map.set(item.code, { ...prev, ...item, featured: true });
  });

  const ops = [] as any[];
  for (const value of map.values()) {
    const update: any = {
      name: value.name,
      icon: value.icon,
      category: value.category || "game",
      featured: !!value.featured,
      isActive: true,
    };
    // default prices if not set
    update.price = value.price ?? 10000;
    if (value.cost !== undefined) update.cost = value.cost; else update.cost = null;
    ops.push({
      updateOne: {
        filter: { code: value.code },
        update: { $set: update, $setOnInsert: { code: value.code } },
        upsert: true,
      },
    });
  }

  if (ops.length) {
    await db.collection("products").bulkWrite(ops, { ordered: false });
  }

  return Response.json({ success: true, insertedOrUpdated: ops.length });
}
