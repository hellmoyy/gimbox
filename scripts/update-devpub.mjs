#!/usr/bin/env node
/*
Usage:
  node scripts/update-devpub.mjs                # Enrich missing developer/publisher using configured sources
  node scripts/update-devpub.mjs --dry          # Dry-run (no DB writes), show proposed changes
  node scripts/update-devpub.mjs --limit 50     # Limit processed brands
  node scripts/update-devpub.mjs --file data.json  # Apply developer/publisher from a JSON mapping file
  node scripts/update-devpub.mjs --clear-missing # Clear (set undefined) developer/publisher where currently blank strings
  node scripts/update-devpub.mjs --force-enrich  # Force re-enrich even if already set

Mapping file format (data.json):
{
  "brand-code-1": { "developer": "Dev A", "publisher": "Pub A" },
  "brand-code-2": { "developer": "Dev B" }
}

Environment:
  MONGODB_URI required.
  ENRICH_SOURCES (optional, default rawg,wiki) for enrichment mode.
  RAWG_API_KEY optional if rawg used.
*/

import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/mongodb.js';
import { fetchDevPub } from '../src/lib/brandEnrich.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dry:false, limit:0, file:null, clearMissing:false, forceEnrich:false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--limit') { opts.limit = Number(args[++i]||'0'); }
    else if (a === '--file') { opts.file = args[++i] || null; }
    else if (a === '--clear-missing') opts.clearMissing = true;
    else if (a === '--force-enrich') opts.forceEnrich = true;
  }
  return opts;
}

function pad(n, w=2) { return String(n).padStart(w,'0'); }
function logLine(type, msg, extra={}) {
  const ts = new Date();
  const stamp = `${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;
  process.stdout.write(`[${stamp}] [${type}] ${msg}${Object.keys(extra).length? ' '+JSON.stringify(extra):''}\n`);
}

async function main() {
  const opts = parseArgs();
  const db = await getDb();
  const brandsCol = db.collection('brands');
  const mapping = opts.file ? JSON.parse(fs.readFileSync(path.resolve(opts.file),'utf-8')) : null;

  if (mapping) {
    logLine('INFO', 'Applying mapping file', { entries: Object.keys(mapping).length, dry: opts.dry });
    let applied = 0;
    for (const [code, val] of Object.entries(mapping)) {
      const update = {};
      if (val.developer !== undefined) update.developer = val.developer || undefined;
      if (val.publisher !== undefined) update.publisher = val.publisher || undefined;
      if (Object.keys(update).length === 0) continue;
      if (opts.dry) {
        logLine('DRY', 'Would update brand', { code, ...update });
      } else {
        await brandsCol.updateOne({ code }, { $set: { ...update, updatedAt: new Date() } });
        logLine('APPLY', 'Updated brand', { code, ...update });
        applied++;
      }
    }
    logLine('INFO', 'Mapping processing done', { applied });
    return;
  }

  if (opts.clearMissing) {
    logLine('INFO', 'Clearing blank fields');
    const query = { $or: [ { developer: '' }, { publisher: '' } ] };
    const toClear = await brandsCol.find(query).project({ code:1, developer:1, publisher:1 }).toArray();
    for (const b of toClear) {
      const update = {};
      if (b.developer === '') update.developer = undefined;
      if (b.publisher === '') update.publisher = undefined;
      if (!opts.dry) await brandsCol.updateOne({ code: b.code }, { $set: { ...update, updatedAt: new Date() } });
      logLine(opts.dry? 'DRY':'CLEAR', 'Cleared', { code: b.code, ...update });
    }
    logLine('INFO', 'Clearing done', { count: toClear.length });
    if (!opts.forceEnrich) return; // continue to enrichment only if forced
  }

  // Enrichment mode
  const filter = opts.forceEnrich ? {} : { $or: [ { developer: { $exists: false } }, { publisher: { $exists: false } } ] };
  const cursor = brandsCol.find(filter).project({ code:1, name:1, developer:1, publisher:1 });
  const total = await cursor.count();
  logLine('INFO', 'Enrichment scan start', { total, force: opts.forceEnrich, limit: opts.limit||'none' });
  let processed = 0, updated=0, skipped=0, errors=0;
  while (await cursor.hasNext()) {
    if (opts.limit && processed >= opts.limit) break;
    const b = await cursor.next();
    processed++;
    try {
      if (!opts.forceEnrich && b.developer && b.publisher) { skipped++; continue; }
      const res = await fetchDevPub(b.name || b.code);
      if (res && (res.developer || res.publisher)) {
        const update = {};
        if (res.developer && (!b.developer || opts.forceEnrich)) update.developer = res.developer;
        if (res.publisher && (!b.publisher || opts.forceEnrich)) update.publisher = res.publisher;
        if (Object.keys(update).length) {
          if (opts.dry) logLine('DRY','Would set', { code: b.code, ...update });
          else {
            await brandsCol.updateOne({ code: b.code }, { $set: { ...update, updatedAt: new Date() } });
            logLine('SET','Updated', { code: b.code, ...update });
            updated++;
          }
        } else skipped++;
      } else {
        skipped++;
      }
    } catch (e) {
      errors++;
      logLine('ERR','Failed enrich', { code: b.code, message: e?.message });
    }
  }
  logLine('INFO','Enrichment done', { processed, updated, skipped, errors });
}

main().then(()=>{ process.exit(0); }).catch(e=>{ console.error(e); process.exit(1); });
