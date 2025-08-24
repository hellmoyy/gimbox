import { getDb } from './mongodb';

// Create necessary unique indexes (idempotent) to prevent case-variant duplicates.
// MongoDB unique on lowercase stored field works since we normalize codes to lowercase before insert.
export async function ensureIndexes() {
  const db = await getDb();
  try {
    await db.collection('brands').createIndex({ code: 1 }, { unique: true, name: 'uniq_brand_code' });
  } catch {}
  try {
    await db.collection('products').createIndex({ code: 1 }, { unique: true, name: 'uniq_product_code' });
  } catch {}
  // Optional: providerRefs uniqueness inside array not enforced here; handled logically in resolvers.
}

// Utility one-off CLI style runner (optional import in API routes if needed)
export async function runEnsureIndexesIfNeeded() {
  try { await ensureIndexes(); } catch {}
}
