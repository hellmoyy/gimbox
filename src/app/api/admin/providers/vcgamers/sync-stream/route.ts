import { NextRequest } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getDb } from '@/lib/mongodb';
import { getBrands, getBrandProducts, getVariations } from '@/lib/providers/vcgamers';
import { resolveBrand } from '@/lib/brandResolver';
import crypto from 'crypto';
import { copyImageToCDN, shouldCopyRemote } from '@/lib/imageStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const deactivateMissing = searchParams.get('deactivateMissing') !== 'false';
  const globalMarkup = Number(searchParams.get('markupPercent') || process.env.DEFAULT_MARKUP_PERCENT || 0);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: any) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      }
      const startedAt = Date.now();
      send({ type: 'start', startedAt, deactivateMissing, globalMarkup });
      let brands: Array<{ key: string; name: string }>; 
      try {
        brands = await getBrands();
      } catch (e: any) {
        send({ type: 'error', message: e?.message || 'Failed get brands' });
        controller.close();
        return;
      }
      send({ type: 'brands', count: brands.length });
      const db = await getDb();
      // Preload brand markup map
      // Ensure canonical brands exist / mapped
      const canonicalMap = new Map<string,string>(); // providerKey -> canonicalCode
      for (const b of brands) {
        if (!b.key) continue;
        try {
          const resolved = await resolveBrand({ provider: 'vcgamers', providerBrandCode: b.key, providerBrandName: b.name, defaultMarkupPercent: globalMarkup });
          if (resolved) {
            // Ensure icon present & internalized
            const placeholder = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';
            let icon = (resolved as any).icon || placeholder;
            if (shouldCopyRemote(icon)) {
              const copied = await copyImageToCDN(icon, { folder: 'brands', slug: resolved.code });
              if (copied) icon = copied;
            }
            await (await getDb()).collection('brands').updateOne({ code: resolved.code }, { $set: { icon } });
          }
          if (resolved) canonicalMap.set(b.key, resolved.code);
        } catch {}
      }
      const brandDocs = await db.collection('brands').find({ code: { $in: Array.from(new Set(Array.from(canonicalMap.values()))) } }).project({ code:1, defaultMarkupPercent:1 }).toArray();
      const markupMap = new Map<string, number>();
      for (const d of brandDocs) {
        if (typeof (d as any).defaultMarkupPercent === 'number') markupMap.set((d as any).code, (d as any).defaultMarkupPercent);
      }
      const allCodes = new Set<string>();
      let upserted = 0;
      let brandIndex = 0;
      for (const b of brands) {
        brandIndex++;
        if (!b.key) continue;
  const canonicalCode = canonicalMap.get(b.key) || b.key;
  send({ type: 'brand:start', key: b.key, canonical: canonicalCode, name: b.name, index: brandIndex, total: brands.length });
        let list: any[] = [];
        try {
          list = await getBrandProducts(b.key);
        } catch (e:any) {
          send({ type: 'brand:warn', key: b.key, canonical: canonicalCode, message: e?.message || 'brand products fetch failed' });
        }
        // Fallback / augmentation: fetch variations (public endpoint) then merge
        let variations: any[] = [];
        try {
          variations = await getVariations(b.key);
        } catch (e:any) {
          // silent; we'll proceed with what we have
        }
        if (variations.length) {
          const map = new Map<string, any>();
          for (const p of list) {
            if (!p?.providerProductCode) continue; 
            map.set(p.providerProductCode, { ...p });
          }
            for (const v of variations) {
              if (!v?.providerProductCode) continue;
              const existing = map.get(v.providerProductCode) || {};
              map.set(v.providerProductCode, {
                providerProductCode: v.providerProductCode,
                name: v.name || existing.name,
                cost: typeof v.cost === 'number' && v.cost >= 0 ? v.cost : existing.cost,
                image: existing.image, // image only from brand product fetch
                _variationMeta: { sla: v.meta?.sla, isNew: v.meta?.isNew, variationActive: v.meta?.isActive }
              });
            }
          list = Array.from(map.values());
        }
        const totalProducts = list.length;
        const effectiveMarkup = markupMap.get(canonicalCode) ?? globalMarkup;
        let processed = 0;
        for (const p of list) {
          if (!p.providerProductCode) continue;
          const code = `${canonicalCode}-${p.providerProductCode}`.toLowerCase();
            allCodes.add(code);
            const hashSource = [p.name, p.cost, p.providerProductCode].join('|');
            const hash = crypto.createHash('md5').update(hashSource).digest('hex');
            const existing = await db.collection('products').findOne({ code }, { projection: { customPrice:1, hash:1, price:1, purchaseMode:1, purchaseFields:1 } });
            if (existing?.hash === hash) { processed++; continue; }
            // image normalization
            let icon = p.image || process.env.PRODUCT_PLACEHOLDER_URL || undefined;
            if (icon && shouldCopyRemote(icon)) {
              const copied = await copyImageToCDN(icon, { folder: 'products', slug: p.providerProductCode });
              if (copied) icon = copied;
            }
            const update: any = {
              name: p.name,
              cost: p.cost,
              provider: 'vcgamers',
              providerCode: p.providerProductCode,
              brandKey: canonicalCode,
              gameCode: canonicalCode,
              category: canonicalCode,
              icon,
              isActive: true,
              updatedAt: new Date(),
              hash,
            };
            if (!existing?.customPrice) {
              update.price = effectiveMarkup > 0 ? Math.round(p.cost * (1 + effectiveMarkup/100)) : p.cost;
            }
            // Heuristic purchase configuration for new inserts
            const isVoucher = canonicalCode.includes('voucher');
            const purchaseMode = canonicalCode === 'mlbb' ? 'user-id-region' : (isVoucher ? 'none' : 'user-id');
            const purchaseFields = canonicalCode === 'mlbb'
              ? [
                  { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 },
                  { key: 'zone_id', label: 'Zone ID', required: true, min: 2, max: 8 }
                ]
              : (isVoucher ? [] : [ { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 } ]);
            await db.collection('products').updateOne(
              { code },
              { 
                $set: update, 
                $setOnInsert: { createdAt: new Date(), purchaseMode, purchaseFields }
              }, 
              { upsert: true }
            );
            // Persist variation meta if available (non-blocking)
            if (p._variationMeta && (p._variationMeta.sla != null || p._variationMeta.isNew != null || p._variationMeta.variationActive != null)) {
              const metaSet: any = { updatedAt: new Date() };
              if (p._variationMeta.sla != null) metaSet['meta.sla'] = p._variationMeta.sla;
              if (p._variationMeta.isNew != null) metaSet['meta.isNew'] = p._variationMeta.isNew;
              if (p._variationMeta.variationActive != null) metaSet['meta.variationActive'] = p._variationMeta.variationActive;
              metaSet['meta.variationKey'] = p.providerProductCode;
              await db.collection('products').updateOne({ code }, { $set: metaSet });
            }
            upserted++; processed++;
            if (processed % 25 === 0 || processed === totalProducts) {
              const pct = totalProducts ? Math.round((processed/totalProducts)*100) : 0;
              send({ type: 'brand:progress', key: b.key, canonical: canonicalCode, processed, totalProducts, pct });
            }
        }
        send({ type: 'brand:done', key: b.key, canonical: canonicalCode, products: totalProducts, upsertedBrand: processed });
      }
      let deactivated = 0;
      if (deactivateMissing) {
        const res = await db.collection('products').updateMany({ provider:'vcgamers', code: { $nin: Array.from(allCodes) } }, { $set: { isActive:false, updatedAt: new Date() } });
        deactivated = res.modifiedCount || 0;
      }
      const finishedAt = Date.now();
      send({ type: 'done', durationMs: finishedAt - startedAt, brands: brands.length, upserted, active: allCodes.size, deactivated });
      controller.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
