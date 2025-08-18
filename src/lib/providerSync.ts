import crypto from "crypto";
import { getDb } from "./mongodb";
import { VCGAMERS_API_KEY as CFG_VCG_KEY, VCGAMERS_SECRET_KEY as CFG_VCG_SECRET } from "./runtimeConfig";
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

// Insert-only import: add new products that don't exist yet, do not modify existing ones
export async function importProductsAddOnly(list: ProviderItem[]) {
  if (!Array.isArray(list) || list.length === 0) return { inserted: 0 };
  const db = await getDb();
  const codes = Array.from(new Set(list.map((i) => i.code).filter(Boolean)));
  if (codes.length === 0) return { inserted: 0 };
  const existing = await db.collection("products").find({ code: { $in: codes } }).project({ code: 1 }).toArray();
  const existingSet = new Set(existing.map((d: any) => d.code));
  const toInsertRaw = list.filter((i) => i.code && !existingSet.has(i.code));
  if (toInsertRaw.length === 0) return { inserted: 0 };
  // Prepare categories upsert first
  const catPairs: Array<{ code: string; name: string }> = [];
  for (const it of toInsertRaw) {
    const catRaw = (it as any).category as string | undefined;
    if (catRaw) {
      let code = (catRaw || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!code) code = "game";
      catPairs.push({ code, name: catRaw || code });
    }
  }
  // Upsert categories (best-effort)
  for (const c of catPairs) {
    try {
      await db.collection("categories").updateOne(
        { code: c.code },
        { $set: { code: c.code, name: c.name, isActive: true } },
        { upsert: true }
      );
    } catch {}
  }
  // Build docs for insert
  const docs = toInsertRaw.map((it) => {
    const catRaw = (it as any).category as string | undefined;
    let category: string | undefined = undefined;
    if (catRaw) {
      let code = (catRaw || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!code) code = "game";
      category = code;
    }
    return {
      code: it.code,
      name: it.name,
      cost: (it as any).cost ?? 0,
      price: (it as any).cost ?? 0,
      icon: (it as any).icon,
      category: category,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  });
  try {
    const res = await db.collection("products").insertMany(docs, { ordered: false });
    return { inserted: res.insertedCount || docs.length };
  } catch (e: any) {
    // In case of dup key races, ignore and count successful inserts
    const msg = String(e?.message || "");
    if (/E11000 duplicate key/i.test(msg)) {
      // Fallback to counting currently inserted documents by checking codes again
      const nowExisting = await db.collection("products").find({ code: { $in: docs.map((d: any) => d.code) } }).project({ _id: 1 }).toArray();
      return { inserted: nowExisting.length - existing.length };
    }
    return { inserted: 0 };
  }
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

// Import-only version: add new items only, do not modify existing ones
export async function importProviderNewOnly(provider: ProviderName, settingsMain?: any) {
  const s = settingsMain || (await (await getDb()).collection("settings").findOne({ _id: "main" as any }));
  let list: ProviderItem[] = [];
  if (provider === "digiflazz") {
    list = await fetchDigiflazzPriceList(s?.digiflazz_username || process.env.DIGIFLAZZ_USERNAME || "", s?.digiflazz_api_key || process.env.DIGIFLAZZ_API_KEY || "");
  } else if (provider === "iak") {
    list = await fetchIAKPriceList(s?.iak_username || process.env.IAK_USERNAME || "", s?.iak_api_key || process.env.IAK_API_KEY || "", s?.iak_secret || process.env.IAK_SECRET || "");
  } else if (provider === "vcgamers") {
    // Pre-check keys to provide clearer error than silent empty list
    const key = (typeof CFG_VCG_KEY === "string" && CFG_VCG_KEY.length ? CFG_VCG_KEY : undefined) || process.env.VCGAMERS_API_KEY || "";
    const secret = (typeof CFG_VCG_SECRET === "string" && CFG_VCG_SECRET.length ? CFG_VCG_SECRET : undefined) || process.env.VCGAMERS_SECRET_KEY || "";
    if (!key || !secret) {
      throw new Error("VCGamers API key/secret belum dikonfigurasi. Set VCGAMERS_API_KEY dan VCGAMERS_SECRET_KEY di .env.local");
    }
    try {
      list = await fetchVCGPriceList();
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Tidak ada data produk dari provider. Pastikan kredensial benar dan endpoint pricelist tersedia.");
  }
  const res = await importProductsAddOnly(list);
  return { provider, count: res.inserted };
}
