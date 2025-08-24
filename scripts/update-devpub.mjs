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
import { getDb } from './lib/mongodb.js';
import { fetchDevPub } from './lib/brandEnrich.js';

function loadDotEnv() {
  if (process.env.MONGODB_URI) return; // already set
  const candidates = ['.env.local', '.env'];
  for (const file of candidates) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {}
    if (process.env.MONGODB_URI) break;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dry:false, limit:0, file:null, clearMissing:false, forceEnrich:false, uri:null };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--limit') { opts.limit = Number(args[++i]||'0'); }
    else if (a === '--file') { opts.file = args[++i] || null; }
    else if (a === '--clear-missing') opts.clearMissing = true;
    else if (a === '--force-enrich') opts.forceEnrich = true;
    else if (a === '--uri') { opts.uri = args[++i] || null; }
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
  loadDotEnv();
  const opts = parseArgs();
  if (opts.uri && !process.env.MONGODB_URI) process.env.MONGODB_URI = opts.uri;
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set. Provide via env, .env(.local), or --uri <connectionString>');
    process.exit(1);
  }
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
