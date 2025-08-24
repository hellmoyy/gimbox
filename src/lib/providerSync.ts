import crypto from "crypto";
import { getDb } from "./mongodb";
import { VCGAMERS_API_KEY as CFG_VCG_KEY, VCGAMERS_SECRET_KEY as CFG_VCG_SECRET } from "./runtimeConfig";
import { getPriceList as fetchVCGPriceList, getBrands as fetchVCGBrands, getBrandProducts as fetchVCGBrandProducts, getVariations as fetchVCGVariations } from "./providers/vcgamers";
import { resolveBrand } from './brandResolver';
import { runEnsureIndexesIfNeeded } from './ensureIndexes';
import { resolveProduct } from './productResolver';
import { fetchDevPub } from './brandEnrich';
import { copyImageToCDN, shouldCopyRemote } from './imageStore';

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

const PRODUCT_ICON_PLACEHOLDER = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';

export async function upsertProductsFromList(list: ProviderItem[]) {
  if (!Array.isArray(list) || list.length === 0) return { upserted: 0 };
  const db = await getDb();
  let upserted = 0;
  for (const item of list) {
    const update: any = { name: item.name, cost: (item as any).cost };
    if ((item as any).icon && String((item as any).icon).trim() !== '') {
      update.icon = (item as any).icon;
    } else {
      update.icon = PRODUCT_ICON_PLACEHOLDER;
    }
    if ((item as any).category) {
      const catRaw = (item as any).category as string;
      let code = (catRaw || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!code) code = "game";
      update.category = code;
      update.categories = [code, 'semua-produk'];
      try {
        await db.collection("categories").updateOne(
          { code },
          { $set: { code, name: catRaw || code, isActive: true } },
          { upsert: true }
        );
      } catch {}
    }
    // Ensure universal category exists and product has it
    try { await db.collection('categories').updateOne({ code: 'semua-produk' }, { $set: { code: 'semua-produk', name: 'Semua Produk', isActive: true } }, { upsert: true }); } catch {}
    await db.collection("products").updateOne(
      { code: item.code },
      { $set: update, $addToSet: { categories: 'semua-produk' }, $setOnInsert: { price: (item as any).cost, isActive: true, categories: update.categories || ['semua-produk'] } },
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
    const rawIcon = (it as any).icon;
    return {
      code: it.code,
      name: it.name,
      cost: (it as any).cost ?? 0,
      price: (it as any).cost ?? 0,
      icon: (rawIcon && String(rawIcon).trim() !== '') ? rawIcon : PRODUCT_ICON_PLACEHOLDER,
      category: category,
  categories: [category, 'semua-produk'].filter(Boolean),
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

// Full sync for VCGamers: brands -> products; multi-provider ready
export async function fullSyncVCGamers(options: { deactivateMissing?: boolean; markupPercent?: number } = {}) {
  // Ensure indexes early (non-blocking if already there)
  await runEnsureIndexesIfNeeded();
  const { deactivateMissing = true, markupPercent = Number(process.env.DEFAULT_MARKUP_PERCENT || 1) } = options;
  const startedAt = new Date();
  const db = await getDb();
  const brands = await fetchVCGBrands();
  const brandUpserts: number[] = [];
  // Upsert brands into games (legacy) and brands (new) collections with provider tag & allow markup
  // Resolve & upsert canonical brand docs, mapping providerRefs
  for (const b of brands) {
    if (!b.key) continue;
    try {
      const resolved = await resolveBrand({ provider: 'vcgamers', providerBrandCode: b.key, providerBrandName: b.name, defaultMarkupPercent: markupPercent });
      if (resolved) {
        // Update basic display fields if changed (name/icon)
        const setDoc: any = { updatedAt: new Date(), isActive: true };
        if (b.name && b.name !== resolved.name) setDoc.name = b.name;
        if (b.image) {
          let iconUrl = b.image;
          if (shouldCopyRemote(iconUrl)) {
            const copied = await copyImageToCDN(iconUrl, { folder: 'brands', slug: resolved.code });
            if (copied) iconUrl = copied;
          }
          setDoc.icon = iconUrl;
        } else if (!resolved.icon) {
          setDoc.icon = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';
        }
        await db.collection('brands').updateOne({ code: resolved.code }, { $set: setDoc });
        await db.collection('games').updateOne(
          { code: resolved.code },
          { $set: { code: resolved.code, name: setDoc.name || resolved.name, icon: b.image || resolved.icon, provider: 'vcgamers', isActive: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        );
          // attempt lightweight enrichment if missing dev/pub using configured ENRICH_SOURCES
          if (!resolved.developer || !resolved.publisher) {
            try {
              const ext = await fetchDevPub(b.name || resolved.name);
              if (ext && (ext.developer || ext.publisher)) {
                if (ext.developer && !resolved.developer) setDoc.developer = ext.developer;
                if (ext.publisher && !resolved.publisher) setDoc.publisher = ext.publisher;
              }
            } catch {}
          }
        brandUpserts.push(1);
      }
    } catch {}
  }
  // Fetch products per brand (sequential with small concurrency to reduce pressure)
  const allCodes: Set<string> = new Set();
  let productsUpserted = 0;
  for (const b of brands) {
    if (!b.key) continue;
    // Resolve canonical brand again (should exist now)
    const resolved = await resolveBrand({ provider: 'vcgamers', providerBrandCode: b.key, providerBrandName: b.name, allowCreate: true, defaultMarkupPercent: markupPercent });
    if (!resolved) continue;
    const canonicalCode = resolved.code;
    const brandDoc = await db.collection('brands').findOne({ code: canonicalCode }, { projection: { defaultMarkupPercent: 1 } });
    const effectiveMarkup = typeof brandDoc?.defaultMarkupPercent === 'number' ? brandDoc.defaultMarkupPercent : markupPercent;
    const prodsBrand = await fetchVCGBrandProducts(b.key).catch(()=>[]) as any[];
    const prodsVarRaw = await fetchVCGVariations(b.key).catch(()=>[]);
    // Merge lists (variation meta wins for meta fields; brand list may have image)
    const mergedMap = new Map<string, any>();
    for (const p of prodsBrand) {
      if (!p?.providerProductCode) continue;
      mergedMap.set(p.providerProductCode, { ...p });
    }
    for (const v of prodsVarRaw) {
      if (!v?.providerProductCode) continue;
      const existing = mergedMap.get(v.providerProductCode) || {};
      mergedMap.set(v.providerProductCode, {
        providerProductCode: v.providerProductCode,
        name: v.name || existing.name,
        cost: typeof v.cost === 'number' && v.cost >= 0 ? v.cost : existing.cost,
        image: existing.image || v.meta?.image,
        _variationMeta: { sla: v.meta?.sla, isNew: v.meta?.isNew, variationActive: v.meta?.isActive }
      });
    }
    const prods = Array.from(mergedMap.values());
    for (const p of prods) {
      if (!p.providerProductCode) continue;
      let img = p.image || PRODUCT_ICON_PLACEHOLDER;
      if (shouldCopyRemote(img)) {
        const copied = await copyImageToCDN(img, { folder: 'products', slug: p.providerProductCode });
        if (copied) img = copied;
      }
      const resolvedProd = await resolveProduct({ provider: 'vcgamers', providerProductCode: p.providerProductCode, name: p.name, cost: p.cost, brandKey: canonicalCode, image: img, allowCreate: true });
      if (!resolvedProd) continue;
      allCodes.add(resolvedProd.code);
      // Apply markup if no customPrice & price equals cost
      if (!resolvedProd.customPrice) {
        const targetPrice = effectiveMarkup > 0 ? Math.round(p.cost * (1 + effectiveMarkup/100)) : p.cost;
        if (resolvedProd.price !== targetPrice) {
          await db.collection('products').updateOne({ code: resolvedProd.code }, { $set: { price: targetPrice, updatedAt: new Date() } });
        }
      }
      // Persist variation meta (sla, isNew) if present
      if (p._variationMeta && (p._variationMeta.sla != null || p._variationMeta.isNew != null)) {
        const metaSet: any = { updatedAt: new Date() };
        if (p._variationMeta.sla != null) metaSet['meta.sla'] = p._variationMeta.sla;
        if (p._variationMeta.isNew != null) metaSet['meta.isNew'] = p._variationMeta.isNew;
        if (p._variationMeta.variationActive != null) metaSet['meta.variationActive'] = p._variationMeta.variationActive;
        // Store variation key for traceability (idempotent)
        metaSet['meta.variationKey'] = p.providerProductCode;
        await db.collection('products').updateOne({ code: resolvedProd.code }, { $set: metaSet });
      }
      // Backfill purchaseMode & purchaseFields for older products missing these (heuristic same as resolver)
      if (resolvedProd.purchaseMode === undefined || resolvedProd.purchaseFields === undefined) {
        const isVoucher = resolvedProd.brandKey?.includes('voucher');
        const pm = resolvedProd.brandKey === 'mlbb' ? 'user-id-region' : (isVoucher ? 'none' : 'user-id');
        const pf = resolvedProd.brandKey === 'mlbb'
          ? [
              { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 },
              { key: 'zone_id', label: 'Zone ID', required: true, min: 2, max: 8 }
            ]
          : (isVoucher ? [] : [ { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 } ]);
        await db.collection('products').updateOne({ code: resolvedProd.code }, { $set: { purchaseMode: pm, purchaseFields: pf, updatedAt: new Date() } });
      }
      productsUpserted++;
    }
  }
  let deactivated = 0;
  if (deactivateMissing) {
    const res = await db.collection('products').updateMany(
      { provider: 'vcgamers', code: { $nin: Array.from(allCodes) } },
      { $set: { isActive: false, updatedAt: new Date() } }
    );
    deactivated = res.modifiedCount || 0;
  }
  const finishedAt = new Date();
  const logDoc = {
    provider: 'vcgamers',
    type: 'full-sync',
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    brandsCount: brands.length,
    productsUpserted,
    productsActive: allCodes.size,
    productsDeactivated: deactivated,
  markupPercent,
  };
  try { await db.collection('provider_sync_logs').insertOne(logDoc); } catch {}
  return logDoc;
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
