import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import crypto from "crypto";

// Provider helpers (skeletons)
async function fetchDigiflazzPriceList(username: string, apiKey: string) {
  // sign = md5(username + apiKey + 'pricelist') or per docs variant
  const sign = crypto.createHash("md5").update(username + apiKey + "pricelist").digest("hex");
  // TODO: POST to Digiflazz price list endpoint and map data
  return [] as Array<{ code: string; name: string; cost: number }>; // placeholder
}

async function fetchIAKPriceList(username: string, apiKey: string, secret: string) {
  // TODO: call IAK price list (see https://api.iak.id/api/guide)
  return [] as Array<{ code: string; name: string; cost: number }>;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const provider = String(form.get("provider"));
  let db;
  try {
    db = await getDb();
  } catch (e) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
  const s: any = await db.collection("settings").findOne({ _id: "main" as any });

  let list: Array<{ code: string; name: string; cost: number }> = [];
  if (provider === "digiflazz") {
    list = await fetchDigiflazzPriceList(s?.digiflazz_username || process.env.DIGIFLAZZ_USERNAME || "", s?.digiflazz_api_key || process.env.DIGIFLAZZ_API_KEY || "");
  } else if (provider === "iak") {
    list = await fetchIAKPriceList(s?.iak_username || process.env.IAK_USERNAME || "", s?.iak_api_key || process.env.IAK_API_KEY || "", s?.iak_secret || process.env.IAK_SECRET || "");
  }

  try {
    for (const item of list) {
      // Allow provider to pass icon/category fields if available
      const update: any = { name: item.name, cost: (item as any).cost };
      if ((item as any).icon) update.icon = (item as any).icon;
      if ((item as any).category) {
        const catRaw = (item as any).category as string;
        let code = (catRaw || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!code) code = "game";
        update.category = code;
        try {
          await db.collection("categories").updateOne(
            { code },
            { $set: { code, name: catRaw || code, isActive: true } },
            { upsert: true }
          );
        } catch {}
      }
      await db.collection("products").updateOne(
        { code: item.code },
        { $set: update, $setOnInsert: { price: (item as any).cost, isActive: true } },
        { upsert: true }
      );
    }
  } catch (e) {
    return Response.json({ error: "Failed to upsert products" }, { status: 500 });
  }

  return Response.redirect(new URL("/admin/products", req.url));
}
