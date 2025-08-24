import { getDb } from './mongodb';
import crypto from 'crypto';

// Product schema additions (products collection):
// providerRefs?: { [provider: string]: string[] } // provider -> list of provider product codes
// brandKey: canonical brand code

function buildCode(brandKey: string, slug: string) {
  return `${brandKey}-${slug}`.toLowerCase();
}

export async function resolveProduct(options: {
  provider: string;
  providerProductCode: string; // raw code from provider
  name: string;
  cost: number;
  brandKey: string; // canonical brand key already resolved
  image?: string;
  allowCreate?: boolean;
}): Promise<any | null> {
  const { provider, providerProductCode, name, cost, brandKey, image, allowCreate = true } = options;
  const db = await getDb();
  const slug = providerProductCode.toLowerCase();
  // Try direct product code pattern first
  const directCode = buildCode(brandKey, providerProductCode);
  let prod = await db.collection('products').findOne({ code: directCode });
  if (prod) {
    const set: any = { updatedAt: new Date(), isActive: true };
    if (name && name !== prod.name) set.name = name;
    if (typeof cost === 'number' && cost >= 0) set.cost = cost;
    if (image) set.icon = image;
    const hash = crypto.createHash('md5').update([name, cost, providerProductCode].join('|')).digest('hex');
    set.hash = hash;
    // link providerRefs & categories (ensure brandKey + 'semua-produk')
    await db.collection('products').updateOne(
      { code: prod.code },
      {
        $set: set,
        $addToSet: {
          [`providerRefs.${provider}`]: providerProductCode,
          categories: { $each: [brandKey, 'semua-produk'] },
        } as any,
      }
    );
    return await db.collection('products').findOne({ code: prod.code });
  }
  // Try providerRefs mapping
  prod = await db.collection('products').findOne({ [`providerRefs.${provider}`]: providerProductCode, brandKey });
  if (prod) return prod;
  if (!allowCreate) return null;
  const code = buildCode(brandKey, providerProductCode);
  const hash = crypto.createHash('md5').update([name, cost, providerProductCode].join('|')).digest('hex');
  const doc: any = {
    code,
    name,
    cost,
    price: cost, // markup applied elsewhere if desired
    provider,
    providerCode: providerProductCode,
    brandKey,
    gameCode: brandKey,
    category: brandKey,
    categories: [brandKey, 'semua-produk'],
    icon: image,
    isActive: true,
    providerRefs: { [provider]: [providerProductCode] },
    // Default purchase configuration heuristic: MLBB needs user+zone, vouchers none, else user only
    purchaseMode: brandKey === 'mlbb' ? 'user-id-region' : (brandKey.includes('voucher') ? 'none' : 'user-id'),
    // purchaseFields array drives dynamic form; initial simple heuristic (can be updated later manually)
    purchaseFields: brandKey === 'mlbb'
      ? [
          { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 },
          { key: 'zone_id', label: 'Zone ID', required: true, min: 2, max: 8 }
        ]
      : (brandKey.includes('voucher')
          ? []
          : [ { key: 'user_id', label: 'User ID', required: true, min: 6, max: 16 } ]),
    hash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    await db.collection('products').insertOne(doc);
    return doc;
  } catch (e:any) {
    // Race: fetch again
    return await db.collection('products').findOne({ code });
  }
}
