import crypto from "crypto";
import { getDb } from "./mongodb";
import { getPriceList as fetchVCGPriceList } from "./providers/vcgamers";

// Normalize a provider price list item shape
export type ProviderItem = { code: string; name: string; cost: number; icon?: string; category?: string };

// TODO implementations for Digiflazz & IAK; keep placeholders so cron won't fail
export async function fetchDigiflazzPriceList(username: string, apiKey: string): Promise<ProviderItem[]> {
  if (!username || !apiKey) return [];
  const sign = crypto.createHash("md5").update(username + apiKey + "pricelist").digest("hex");
  // TODO: call Digiflazz API using username, sign
  void sign;
  return [];
}

export async function fetchIAKPriceList(username: string, apiKey: string, secret: string): Promise<ProviderItem[]> {
  if (!username || !apiKey || !secret) return [];
  // TODO: call IAK API as per docs
  return [];
}

export async function upsertProductsFromList(list: ProviderItem[]) {
  if (!Array.isArray(list) || list.length === 0) return { upserted: 0 };
  const db = await getDb();
  let upserted = 0;
  for (const item of list) {
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
    upserted++;
  }
  return { upserted };
}

export type ProviderName = "digiflazz" | "iak" | "vcgamers";

export async function syncProvider(provider: ProviderName, settingsMain?: any) {
  const s = settingsMain || (await (await getDb()).collection("settings").findOne({ _id: "main" as any }));
  let list: ProviderItem[] = [];
  if (provider === "digiflazz") {
    list = await fetchDigiflazzPriceList(s?.digiflazz_username || process.env.DIGIFLAZZ_USERNAME || "", s?.digiflazz_api_key || process.env.DIGIFLAZZ_API_KEY || "");
  } else if (provider === "iak") {
    list = await fetchIAKPriceList(s?.iak_username || process.env.IAK_USERNAME || "", s?.iak_api_key || process.env.IAK_API_KEY || "", s?.iak_secret || process.env.IAK_SECRET || "");
  } else if (provider === "vcgamers") {
    try {
      list = await fetchVCGPriceList();
    } catch {
      list = [];
    }
  }
  const res = await upsertProductsFromList(list);
  return { provider, count: res.upserted };
}
