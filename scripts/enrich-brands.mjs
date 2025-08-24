#!/usr/bin/env node
// Brand enrichment script (manual run):
// Usage examples:
//   RAWG_API_KEY=xxxx node scripts/enrich-brands.mjs --provider=rawg --limit=50
//   RAWG_API_KEY=xxxx node scripts/enrich-brands.mjs --provider=rawg --force --limit=200
// Options:
//   --limit=N        : max brands to scan (default 200)
//   --provider=rawg  : currently only 'rawg' implemented
//   --force          : overwrite existing developer/publisher
//   --dry            : dry-run (no DB writes)
// Env:
//   MONGODB_URI (required), RAWG_API_KEY (required for provider=rawg)
import { MongoClient } from 'mongodb';
import process from 'process';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

function parseArgs() {
  const args = {}; const raw = process.argv.slice(2);
  for (const a of raw) {
    const m = a.match(/^--([^=]+)=(.*)$/); if (m) args[m[1]] = m[2];
  }
  return args;
}

async function fetchExternalData(name, aliases = [], provider = 'rawg') {
  if (provider !== 'rawg') return { developer: undefined, publisher: undefined };
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    console.warn('[enrich] RAWG_API_KEY not set, skip');
    return { developer: undefined, publisher: undefined };
  }
  const query = encodeURIComponent(name);
  const url = `https://api.rawg.io/api/games?search=${query}&page_size=5&key=${apiKey}`;
  let json;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) {
      console.warn('[enrich] RAWG fetch non-200', res.status);
      return { developer: undefined, publisher: undefined };
    }
    json = await res.json();
  } catch (e) {
    console.warn('[enrich] RAWG fetch error', e?.message || e);
    return { developer: undefined, publisher: undefined };
  }
  if (!json || !Array.isArray(json.results) || json.results.length === 0) return { developer: undefined, publisher: undefined };
  const normAliases = new Set([norm(name), ...aliases.map(a=>norm(a))]);
  // Pick best match: slug or name normalized in aliases or highest rating
  let candidate = json.results[0];
  for (const r of json.results) {
    const slug = r.slug ? norm(r.slug) : undefined;
    const nm = r.name ? norm(r.name) : undefined;
    if (slug && normAliases.has(slug)) { candidate = r; break; }
    if (nm && normAliases.has(nm)) { candidate = r; break; }
  }
  // For detailed developer/publisher arrays we may need a game detail call, but RAWG results already include arrays developers/publishers when using detail endpoint; search list may not. Attempt detail fetch.
  let devName, pubName;
  if (candidate && candidate.id) {
    try {
      const detailRes = await fetch(`https://api.rawg.io/api/games/${candidate.id}?key=${apiKey}`);
      if (detailRes.ok) {
        const detail = await detailRes.json();
        if (Array.isArray(detail.developers) && detail.developers.length) devName = detail.developers[0].name;
        if (Array.isArray(detail.publishers) && detail.publishers.length) pubName = detail.publishers[0].name;
      }
    } catch {}
  }
  return { developer: devName, publisher: pubName };
}

function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

async function main() {
  const args = parseArgs();
  const limit = Number(args.limit || 200);
  const provider = args.provider || 'rawg';
  const force = 'force' in args;
  const dry = 'dry' in args;
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(args.db || 'topupsaas');

  const baseFilter = force ? {} : { $or: [ { developer: { $exists: false } }, { publisher: { $exists: false } } ] };
  const cursor = db.collection('brands').find(baseFilter).limit(limit);
  let updated = 0; let scanned = 0;
  while (await cursor.hasNext()) {
    const b = await cursor.next(); if (!b) break; scanned++;
    const aliases = Array.isArray(b.aliases) ? b.aliases : [];
    const ext = await fetchExternalData(b.name, aliases, provider).catch(()=>({}));
    const set = {}; if (ext.developer) set.developer = ext.developer; if (ext.publisher) set.publisher = ext.publisher;
    if (Object.keys(set).length) {
      if (!dry) {
        await db.collection('brands').updateOne({ _id: b._id }, { $set: { ...set, updatedAt: new Date() } });
      }
      updated++;
      console.log('Updated', b.code, set);
    } else {
      console.log('Skip', b.code, '(no data)');
    }
    // simple pacing to avoid rate-limit (RAWG docs suggest respectful usage)
    await new Promise(r=>setTimeout(r, 200));
  }
  console.log('Done. Scanned:', scanned, 'Updated:', updated);
  await client.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });
