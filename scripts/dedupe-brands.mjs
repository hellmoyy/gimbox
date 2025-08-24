#!/usr/bin/env node
/*
Deduplicate brand documents differing only by case of provider brand codes.
Strategy:
1. Load all brands.
2. Build map provider->lowercaseProviderCode -> list of brand _ids containing it.
3. If multiple brands share same providerRef lowercased, pick canonical (first with most data: icon, developer/publisher, flags, earliest createdAt).
4. Merge others into canonical:
   - Merge aliases
   - Merge providerRefs arrays (lowercased unique)
   - Preserve manual fields if canonical lacks them (developer/publisher, orders, flags)
   - Repoint products.brandKey & code pattern collisions: for products whose brandKey == duplicate.code, update to canonical.code and adjust code field (brandKey + '-' + provider product slug). If new code would collide, skip rename and log.
   - Deactivate duplicate brand doc (set mergedInto + isActive:false) OR delete (safer: mark merged).
5. Output summary.
Dry-run default; use --apply to persist.
*/
import { getDb } from './lib/mongodb.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function pickCanonical(group, brands) {
  if (group.length === 1) return group[0];
  // score: has icon + developer + publisher + flags + older createdAt
  return group.sort((a,b)=>{
    function score(x){
      let s=0; if (x.icon) s++; if (x.developer) s++; if (x.publisher) s++; if (x.featured||x.newRelease||x.voucher||x.pulsaTagihan||x.entertainment) s++; s+= (x.createdAt? -new Date(x.createdAt).getTime()/1e13:0); return -s; }
    return score(a)-score(b);
  })[0];
}

function uniq(arr){ return Array.from(new Set(arr.filter(Boolean))); }

function loadDotEnv() {
  if (process.env.MONGODB_URI) return;
  for (const file of ['.env.local', '.env']) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p,'utf-8');
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
    if (process.env.MONGODB_URI) break;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { apply:false, provider:null, code:null, json:false, limit:0, uri:null, report:false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--apply') opts.apply = true;
    else if (a === '--provider') opts.provider = args[++i] || null;
    else if (a === '--code') opts.code = args[++i] || null;
    else if (a === '--json') opts.json = true;
    else if (a === '--limit') opts.limit = Number(args[++i]||0);
    else if (a === '--report') opts.report = true;
    else if (a === '--uri') opts.uri = args[++i] || null;
  }
  return opts;
}

function log(msg, obj){ if (!globalThis.__JSON_ONLY__) console.log(msg, obj? JSON.stringify(obj):''); }

async function main(){
  loadDotEnv();
  const opts = parseArgs();
  if (opts.uri && !process.env.MONGODB_URI) process.env.MONGODB_URI = opts.uri;
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set (env/.env/.env.local or --uri).');
    process.exit(1);
  }
  globalThis.__JSON_ONLY__ = opts.json;
  const apply = opts.apply;
  const db = await getDb();
  const baseFilter = {};
  if (opts.code) baseFilter.code = opts.code;
  const brands = await db.collection('brands').find(baseFilter).toArray();

  if (opts.report) {
    const providerRefDup = {};
    const nameNormDup = {};
    const codeLowerDup = {};
    const normName = (v)=> (v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    for (const b of brands) {
      const cl = (b.code||'').toLowerCase();
      codeLowerDup[cl] ||= []; codeLowerDup[cl].push(b.code);
      const nn = normName(b.name||b.code);
      nameNormDup[nn] ||= []; nameNormDup[nn].push(b.code);
      for (const prov of Object.keys(b.providerRefs||{})) {
        for (const ref of b.providerRefs[prov]||[]) {
          const key = prov+':'+String(ref).toLowerCase();
          providerRefDup[key] ||= []; providerRefDup[key].push(b.code);
        }
      }
    }
    function filterDupe(map) { return Object.fromEntries(Object.entries(map).filter(([,arr])=> new Set(arr).size>1)); }
    const report = {
      providerRefDuplicates: filterDupe(providerRefDup),
      nameNormalizedDuplicates: filterDupe(nameNormDup),
      codeCaseDuplicates: filterDupe(codeLowerDup),
      totalBrands: brands.length
    };
    if (opts.json) {
      console.log(JSON.stringify({ report }, null, 2));
    } else {
      console.log('Duplicate Report');
      for (const [k,v] of Object.entries(report.providerRefDuplicates)) console.log('[providerRef]', k, '=>', v);
      for (const [k,v] of Object.entries(report.nameNormalizedDuplicates)) console.log('[nameNorm ]', k, '=>', v);
      for (const [k,v] of Object.entries(report.codeCaseDuplicates)) console.log('[codeCase ]', k, '=>', v);
      console.log('Total brands:', report.totalBrands);
      if (!Object.keys(report.providerRefDuplicates).length && !Object.keys(report.nameNormalizedDuplicates).length) console.log('No duplicates detected.');
    }
    return;
  }
  const providerIndex = {}; // provider -> lcRef -> list of brand docs
  for (const b of brands) {
    for (const prov of Object.keys(b.providerRefs||{})) {
      if (opts.provider && prov !== opts.provider) continue;
      for (const ref of b.providerRefs[prov]||[]) {
        const lc = String(ref).toLowerCase();
        providerIndex[prov] ||= {}; providerIndex[prov][lc] ||= []; providerIndex[prov][lc].push(b);
      }
    }
  }
  const merges=[];
  let groups=0;
  for (const prov of Object.keys(providerIndex)) {
    for (const ref of Object.keys(providerIndex[prov])) {
      const list = providerIndex[prov][ref];
      if (list.length < 2) continue;
      groups++;
      if (opts.limit && merges.length >= opts.limit) break;
      const canonical = pickCanonical(list, brands);
      const dupes = list.filter(x=>x._id.toString()!==canonical._id.toString());
      if (!dupes.length) continue;
      // Build merged fields
      const mergedAliases = uniq([...(canonical.aliases||[]), ...dupes.flatMap(d=>d.aliases||[])]);
      const mergedRefs = {};
      for (const b of [canonical, ...dupes]) {
        for (const pv of Object.keys(b.providerRefs||{})) {
          mergedRefs[pv] ||= []; mergedRefs[pv].push(...(b.providerRefs[pv]||[]).map(r=>r.toLowerCase()));
        }
      }
      for (const pv of Object.keys(mergedRefs)) mergedRefs[pv]=uniq(mergedRefs[pv]);
      const setUpdate = { aliases: mergedAliases, providerRefs: mergedRefs, updatedAt: new Date() };
      // Fill missing descriptive fields
      for (const field of ['icon','developer','publisher','featured','newRelease','voucher','pulsaTagihan','entertainment','featuredOrder','newReleaseOrder','voucherOrder','pulsaTagihanOrder','entertainmentOrder']) {
        if (canonical[field] == null) {
          const donor = dupes.find(d=>d[field]!=null);
          if (donor) setUpdate[field] = donor[field];
        }
      }
      // Products reassignment
      const prodFilter = { brandKey: { $in: dupes.map(d=>d.code) } };
      const prodCursor = db.collection('products').find(prodFilter).project({ _id:1, code:1, brandKey:1, providerRefs:1 });
      const productUpdates=[];
      while (await prodCursor.hasNext()) {
        const p = await prodCursor.next();
        const oldBrandKey = p.brandKey;
        if (oldBrandKey === canonical.code) continue;
        // Derive new code by replacing prefix oldBrandKey- with canonical.code-
        if (!p.code.startsWith(oldBrandKey+'-')) continue; // unexpected pattern
        const suffix = p.code.slice(oldBrandKey.length+1);
        const newCode = `${canonical.code}-${suffix}`.toLowerCase();
        const existing = await db.collection('products').findOne({ code: newCode });
        if (existing) { continue; } // collision -> skip
        if (apply) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { code: newCode, brandKey: canonical.code, gameCode: canonical.code, category: canonical.code, updatedAt: new Date() } });
        }
        productUpdates.push({ old: p.code, new: newCode });
      }
      if (apply) {
        await db.collection('brands').updateOne({ _id: canonical._id }, { $set: setUpdate });
        await db.collection('brands').updateMany({ _id: { $in: dupes.map(d=>d._id) } }, { $set: { isActive:false, mergedInto: canonical.code, updatedAt: new Date() } });
      }
      const record = { provider: prov, ref, canonical: canonical.code, dupes: dupes.map(d=>d.code), productsChanged: productUpdates.length };
      merges.push(record);
      log(apply? '[APPLY] Merged':'[DRY] Would merge', record);
    }
  }
  if (opts.json) {
    console.log(JSON.stringify({ apply, merges, mergeGroups: merges.length, groupsScanned: groups }, null, 2));
  } else {
    console.log(`Done. Groups merged: ${merges.length}${opts.limit? ` (limit ${opts.limit})`:''}. Run with --json for full data.`);
    if (!apply) console.log('Use --apply to persist changes.');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
