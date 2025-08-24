// Brand resolver utilities for cross-provider brand normalization
// Schema expectations (brands collection):
// {
//   code: string (canonical code, unique)
//   name: string
//   aliases?: string[] (lowercase normalized tokens)
//   providerRefs?: { [provider: string]: string[] } // provider -> list of provider brand codes/keys
// }
import { getDb } from './mongodb';

export type BrandDoc = {
  code: string;
  name: string;
  aliases?: string[];
  providerRefs?: Record<string, string[]>;
  [k: string]: any;
};

function norm(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Resolve or create a canonical brand for a provider brand code/name.
// 1. Try direct match by code
// 2. Try alias match
// 3. Try providerRefs match
// 4. Fallback: create new brand (if allowCreate)
export async function resolveBrand(options: {
  provider: string;
  providerBrandCode: string; // raw code/key from provider
  providerBrandName?: string;
  allowCreate?: boolean;
  defaultMarkupPercent?: number;
}): Promise<BrandDoc | null> {
  const { provider, providerBrandCode, providerBrandName, allowCreate = true, defaultMarkupPercent = Number(process.env.DEFAULT_MARKUP_PERCENT || 1) } = options;
  const db = await getDb();
  const raw = providerBrandCode || providerBrandName || '';
  if (!raw) return null;
  const providerCodeLc = (providerBrandCode || '').toLowerCase();
  const codeGuess = norm(raw);
  // Direct code match
  let doc = await db.collection('brands').findOne({ code: codeGuess }) as BrandDoc | null;
  if (doc) {
    // ensure providerRefs contains mapping (case-insensitive)
    const existingRefs = (doc.providerRefs?.[provider] || []).map(r=>r.toLowerCase());
    const needsUpdate = providerCodeLc && !existingRefs.includes(providerCodeLc);
    if (needsUpdate) {
      await db.collection('brands').updateOne(
        { code: doc.code },
        { $addToSet: { [`providerRefs.${provider}`]: providerCodeLc } }
      );
      doc = await db.collection('brands').findOne({ code: codeGuess }) as BrandDoc | null;
    }
    return doc;
  }
  // Alias match
  doc = await db.collection('brands').findOne({ aliases: codeGuess }) as BrandDoc | null;
  if (doc) {
    const existingRefs = (doc.providerRefs?.[provider] || []).map(r=>r.toLowerCase());
    const needsUpdate = providerCodeLc && !existingRefs.includes(providerCodeLc);
    if (needsUpdate) {
      await db.collection('brands').updateOne(
        { code: doc.code },
        { $addToSet: { [`providerRefs.${provider}`]: providerCodeLc } }
      );
      doc = await db.collection('brands').findOne({ code: doc.code }) as BrandDoc | null;
    }
    return doc;
  }
  // providerRefs match (case-insensitive scan)
  doc = await db.collection('brands').findOne({ [`providerRefs.${provider}`]: { $elemMatch: { $regex: `^${providerCodeLc}$`, $options: 'i' } } }) as BrandDoc | null;
  if (doc) return doc;
  if (!allowCreate) return null;
  // Create new
  const newDoc: BrandDoc = {
    code: codeGuess,
    name: providerBrandName || providerBrandCode,
    aliases: [],
    providerRefs: { [provider]: providerCodeLc ? [providerCodeLc] : [] },
    defaultMarkupPercent,
    provider: 'mixed',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    await db.collection('brands').insertOne(newDoc as any);
  } catch (e:any) {
    // Race: another process created concurrently -> re-fetch
  }
  const inserted = await db.collection('brands').findOne({ code: newDoc.code }) as BrandDoc | null;
  return inserted;
}

// Add alias to a brand (safe idempotent)
export async function addBrandAlias(code: string, alias: string) {
  const db = await getDb();
  const a = norm(alias);
  if (!a || !code) return;
  await db.collection('brands').updateOne({ code }, { $addToSet: { aliases: a }, $set: { updatedAt: new Date() } });
}

// Connect a provider brand code to an existing canonical brand
export async function linkProviderBrand(code: string, provider: string, providerBrandCode: string) {
  const db = await getDb();
  await db.collection('brands').updateOne(
    { code },
    { $addToSet: { [`providerRefs.${provider}`]: providerBrandCode }, $set: { updatedAt: new Date() } }
  );
}
