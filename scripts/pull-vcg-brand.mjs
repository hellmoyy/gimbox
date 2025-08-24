#!/usr/bin/env node
// Pull specific VCGamers brand(s) locally: merges brand products + variations, upserts to Mongo.
// Usage:
//   node scripts/pull-vcg-brand.mjs <brandKey1>[,<brandKey2>] [--dry] [--raw]
//   node scripts/pull-vcg-brand.mjs --list-brands
//   node scripts/pull-vcg-brand.mjs              (interactive pick if no args)
// Env Fallback:
//   VCG_TEST_BRANDS=mlbb,free-fire   (used if no CLI arg provided and not interactive)
// Env: VCGAMERS_API_KEY, VCGAMERS_SECRET_KEY, MONGODB_URI

import fs from 'fs';
import path from 'path';
// We try to reuse project TS libs; if not resolvable (running plain Node without TS build), we fallback to minimal inline versions.
let getBrands, getBrandProducts, getVariations, resolveBrand, resolveProduct, getDb, ARGS;
async function loadProjectLibs() {
  try {
    ({ getBrands, getBrandProducts, getVariations } = await import('../src/lib/providers/vcgamers.ts'));
  } catch {}
  try { ({ resolveBrand } = await import('../src/lib/brandResolver.ts')); } catch {}
  try { ({ resolveProduct } = await import('../src/lib/productResolver.ts')); } catch {}
  try { ({ getDb } = await import('../src/lib/mongodb.ts')); } catch {}
}

// Minimal fallback implementations (only variations + basic brand list using public endpoints)
function baseUrl() {
  const override = (process.env.VCGAMERS_BASE_URL || '').trim();
  if (override) return override.replace(/\/$/, '');
  const sandbox = (ARGS && ARGS.sandbox) || process.env.VCGAMERS_SANDBOX === 'true';
  return sandbox ? 'https://sandbox-api.vcgamers.com' : 'https://mitra-api.vcgamers.com';
}
async function fallbackGetBrands() {
  const apiKey = process.env.VCGAMERS_API_KEY || '';
  const secret = process.env.VCGAMERS_SECRET_KEY || '';
  if (!apiKey || !secret) return [];
  const variants = [secret + 'brand', secret + 'brands'];
  for (const bs of variants) {
    try {
      const hmacHex = (await import('crypto')).default.createHmac('sha512', secret).update(bs).digest('hex');
      const sigs = [Buffer.from(hmacHex).toString('base64'), hmacHex];
      for (const sig of sigs) {
        const url = `${baseUrl()}/v2/public/brands?sign=${encodeURIComponent(sig)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' });
        if (!res.ok) continue;
        const json = await res.json().catch(()=>({}));
        const items = Array.isArray(json?.data) ? json.data : [];
        if (items.length) return items.map(it=>({ key: String(it.key||''), name: String(it.name||'') }));
      }
    } catch {}
  }
  return [];
}
async function fallbackGetVariations(brandKey) {
  try {
    const apiKey = process.env.VCGAMERS_API_KEY || '';
    if (!apiKey) return [];
    const secret = process.env.VCGAMERS_SECRET_KEY || '';
    const brandKeyUpper = brandKey.toUpperCase();
    const brandKeyLower = brandKey.toLowerCase();
    const brandKeyVariants = Array.from(new Set([brandKey, brandKeyUpper, brandKeyLower]));
    const bases = [baseUrl()];
    const pathVariants = ['/v2/public/variations'];
    // Sign formula from doc: secret + "variation+{brand_key}". We'll brute force several interpretations.
    const baseStrings = [];
    for (const bk of brandKeyVariants) {
      baseStrings.push(secret + 'variation+' + bk);
      baseStrings.push(secret + 'variation' + bk);
      baseStrings.push(secret + 'variations+' + bk);
      baseStrings.push(secret + 'variations' + bk);
      baseStrings.push(secret + bk + 'variation');
      baseStrings.push(secret + bk + 'variations');
    }
    const crypto = await import('crypto');
    function hashes(s) {
      const out = [];
      try { out.push(crypto.createHmac('sha512', secret).update(s).digest('hex')); } catch {}
      try { out.push(crypto.createHmac('sha256', secret).update(s).digest('hex')); } catch {}
      try { out.push(crypto.createHash('sha512').update(s).digest('hex')); } catch {}
      try { out.push(crypto.createHash('sha256').update(s).digest('hex')); } catch {}
      return out;
    }
    const signCandidates = new Set();
    for (const bs of baseStrings) {
      signCandidates.add(bs); // raw concat (if API expects plain)
      for (const h of hashes(bs)) {
        signCandidates.add(h);
        signCandidates.add(Buffer.from(h).toString('base64'));
      }
    }
    const headersVariants = [
      { Authorization: `Bearer ${apiKey}` },
      { 'X-Api-Key': apiKey },
      { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      { Authorization: `Bearer ${apiKey}`, 'X-Api-Key': apiKey }
    ];
    const attempts = [];
    let attemptCount = 0;
    for (const b of bases) {
      for (const pv of pathVariants) {
        for (const bk of brandKeyVariants) {
          for (const sign of signCandidates) {
            for (const h of headersVariants) {
              attemptCount++;
              if (attemptCount > 400) break; // safety cap
              const params = new URLSearchParams({ brand_key: bk, sign: String(sign) });
              const url = `${b}${pv}?${params.toString()}`;
              let res; let text='';
              try { res = await fetch(url, { headers: h, cache: 'no-store' }); text = await res.text(); } catch (e) { attempts.push({ url, ok:false, err:e.message }); continue; }
              if (!res.ok) { attempts.push({ url, ok:false, status: res.status }); continue; }
              let json={};
              try { json = JSON.parse(text||'{}'); } catch {}
              const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json)? json: []);
              if (items.length) {
                if (process.env.VCG_VERBOSE==='1') console.log('[variations] success', { brandKey: bk, signSample: String(sign).slice(0,16)+'...', count: items.length });
                return items.map(it=>({ providerProductCode: String(it.key||it.code||''), name: String(it.variation_name||it.name||''), cost: Number(it.price||it.amount||0), meta: { sla: it.sla, isNew: it.is_new, isActive: it.is_active } }));
              }
            }
          }
        }
      }
    }
    if (process.env.VCG_VERBOSE==='1') console.warn('[variations] no data after attempts', attempts.slice(0,10));
    return [];
  } catch { return []; }
}
async function fallbackGetBrandProducts(brandKey) { return []; } // rely on variations only

// Fallback simple resolvers when DB libs unavailable
async function fallbackResolveBrand({ providerBrandCode, providerBrandName }) {
  return { code: (providerBrandCode||providerBrandName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''), name: providerBrandName || providerBrandCode };
}
async function fallbackResolveProduct({ providerProductCode, name, cost, brandKey, image }) {
  return { code: `${brandKey}-${providerProductCode}`.toLowerCase(), name, cost, price: cost, brandKey, icon: image };
}

// Lightweight env loader (no external dotenv dependency)
const cwd = process.cwd();
function loadEnvFile(file) {
  try {
    const full = path.join(cwd, file);
    if (!fs.existsSync(full)) return;
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnvFile('.env.local');
loadEnvFile('.env');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    list: args.includes('--list-brands'),
    dry: args.includes('--dry'),
    raw: args.includes('--raw'),
    verbose: args.includes('--verbose') || process.env.VCG_VERBOSE === '1',
  sandbox: args.includes('--sandbox'),
    brandArg: args.find(a => !a.startsWith('--')) || ''
  };
}

async function prompt(question) {
  return await new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', d => {
      process.stdin.pause();
      resolve(String(d).trim());
    });
  });
}

async function main() {
  ARGS = parseArgs();
  const { list, dry, raw, verbose, brandArg, sandbox } = ARGS;
  if (verbose) process.env.VCG_VERBOSE = '1';
  if (sandbox) console.log('[mode] sandbox API');
  if (list) {
  if (!getBrands) await loadProjectLibs();
  const brands = getBrands ? await getBrands().catch(()=>[]) : await fallbackGetBrands();
    console.log(`Total brands: ${brands.length}`);
    for (const b of brands.slice(0, 50)) {
      console.log('-', b.key, '|', b.name);
    }
    if (brands.length > 50) console.log('...(truncated)');
    return;
  }

  let keys = [];
  if (brandArg) {
    keys = brandArg.split(',').map(s=>s.trim()).filter(Boolean);
  } else if (process.env.VCG_TEST_BRANDS) {
    keys = process.env.VCG_TEST_BRANDS.split(',').map(s=>s.trim()).filter(Boolean);
  } else {
    // Interactive
  console.log('No brand keys provided. Fetching brand list (first 10)...');
  if (!getBrands) await loadProjectLibs();
  const brands = getBrands ? await getBrands().catch(()=>[]) : await fallbackGetBrands();
    const sample = brands.slice(0, 10);
    sample.forEach((b,i)=> console.log(`${i+1}. ${b.key} - ${b.name}`));
    const ans = await prompt('Enter brand numbers or keys (comma separated): ');
    const parts = ans.split(',').map(s=>s.trim()).filter(Boolean);
    for (const p of parts) {
      if (/^\d+$/.test(p)) {
        const idx = Number(p)-1; if (sample[idx]) keys.push(sample[idx].key); else console.warn('Index out of range:', p);
      } else keys.push(p);
    }
    if (!keys.length) {
      console.error('No valid brand selected. Exit.');
      return;
    }
  }
  if (!keys.length) {
    console.error('No brand keys resolved. Usage: node scripts/pull-vcg-brand.mjs <brandKey1>[,<brandKey2>] [--dry]');
    return;
  }
  if (!getBrands) await loadProjectLibs();
  // Assign fallbacks if still missing
  getBrands = getBrands || fallbackGetBrands;
  getBrandProducts = getBrandProducts || fallbackGetBrandProducts;
  getVariations = getVariations || fallbackGetVariations;
  resolveBrand = resolveBrand || fallbackResolveBrand;
  resolveProduct = resolveProduct || fallbackResolveProduct;
  let db = null;
  if (getDb) {
    try { db = await getDb(); } catch { db = null; }
  }
  if (!process.env.VCGAMERS_API_KEY || !process.env.VCGAMERS_SECRET_KEY) {
    console.error('Missing VCGAMERS_API_KEY or VCGAMERS_SECRET_KEY in env (.env.local)');
  } else if (verbose) {
    console.log('[env] baseUrl:', baseUrl());
    console.log('[env] apiKey length:', (process.env.VCGAMERS_API_KEY||'').length, 'secret length:', (process.env.VCGAMERS_SECRET_KEY||'').length);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Warning: MONGODB_URI not set; DB connection may fail.');
  }
  let totalUpserted = 0; let totalFound = 0;
  const outputRaw = [];
  for (const rawKey of keys) {
    let brandKey = rawKey;
    let providerKey = brandKey;
    if (db) {
      const existing = await db.collection('brands').findOne({ $or: [ { code: brandKey }, { providerBrandCode: brandKey } ] });
      if (existing) {
        providerKey = existing.providerBrandCode || existing.code || brandKey;
        if (brandKey !== providerKey) console.log(`[map] input ${brandKey} -> provider ${providerKey}`);
      }
    }
    console.log(`\n=== BRAND INPUT ${brandKey} (provider:${providerKey}) ===`);
    // Resolve or create brand
  const canonical = await resolveBrand({ provider: 'vcgamers', providerBrandCode: providerKey, providerBrandName: providerKey, allowCreate: true });
    if (!canonical) { console.log('Skip: cannot resolve brand'); continue; }
    console.log('Canonical code:', canonical.code);
    // Fetch products list variants
  let products = [];
  try { products = await getBrandProducts(providerKey); } catch (e) { if (verbose) console.warn('brandProducts error', e.message||e); }
  console.log('Brand products fetched:', products.length);
    let variations = [];
  try { variations = await getVariations(providerKey); } catch (e) { console.warn('variations error', e.message||e); }
    console.log('Variations fetched:', variations.length);
    // Merge (variation meta wins cost if present)
    const merged = new Map();
    for (const p of products) { if (!p.providerProductCode) continue; merged.set(p.providerProductCode, { ...p }); }
    for (const v of variations) {
      if (!v.providerProductCode) continue;
      const ex = merged.get(v.providerProductCode) || {};
      merged.set(v.providerProductCode, {
        providerProductCode: v.providerProductCode,
        name: v.name || ex.name,
        cost: typeof v.cost === 'number' ? v.cost : ex.cost,
        image: ex.image,
        _variationMeta: v.meta
      });
    }
    const list = Array.from(merged.values());
    console.log('Merged total:', list.length);
    totalFound += list.length;
  if (raw) outputRaw.push({ brandKey: providerKey, canonical: canonical.code, items: list });
    for (const item of list) {
      if (dry) continue; // skip DB writes
      const resolved = await resolveProduct({ provider: 'vcgamers', providerProductCode: item.providerProductCode, name: item.name, cost: item.cost, brandKey: canonical.code, image: item.image, allowCreate: true });
      if (!resolved) continue;
      if (db) {
        await db.collection('products').updateOne(
          { code: resolved.code },
          { $set: { price: resolved.cost, updatedAt: new Date(), 'meta.sla': item._variationMeta?.sla, 'meta.isNew': item._variationMeta?.isNew, 'meta.variationActive': item._variationMeta?.variationActive, 'meta.variationKey': item.providerProductCode } },
          { upsert: true }
        );
      }
      totalUpserted++;
    }
  console.log(`${dry ? 'Would upsert (dry)' : 'Upserted'} for brand ${providerKey}:`, list.length);
  }
  console.log(`\nDONE. Brands processed: ${keys.length}. Items discovered: ${totalFound}. ${dry ? 'No writes (dry run).' : 'Upserted: '+totalUpserted}`);
  if (raw) {
    console.log('\nRAW_JSON_START');
    process.stdout.write(JSON.stringify(outputRaw, null, 2)+'\n');
    console.log('RAW_JSON_END');
  }
  process.exit(0);
}

main().catch(e=>{ console.error(e); process.exit(1); });
