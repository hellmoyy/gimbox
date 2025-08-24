#!/usr/bin/env node
/**
 * Auto enrichment script for brands developer/publisher.
 * Sources:
 *  - RAWG (structured)    -> requires RAWG_API_KEY
 *  - Wikipedia wikitext   -> public (best-effort infobox parse)
 *
 * Usage examples:
 *  RAWG_API_KEY=xxxx node scripts/auto-enrich-brands.mjs --limit=100
 *  RAWG_API_KEY=xxxx node scripts/auto-enrich-brands.mjs --sources=rawg --force
 *  node scripts/auto-enrich-brands.mjs --sources=wiki --dry
 *
 * Options:
 *  --limit=N        Max brands to scan (default 200)
 *  --force          Overwrite existing developer/publisher
 *  --dry            Dry run (no DB writes)
 *  --sources=list   Comma list (rawg,wiki) order of priority (default rawg,wiki)
 *  --minScore=0.6   Min similarity (0..1) for RAWG candidate acceptance (default 0.55)
 *  --db=name        Mongo database name (default topupsaas)
 */

import { MongoClient } from 'mongodb';
import process from 'process';

// Node 18+ has global fetch

function parseArgs() {
  const args = {}; const raw = process.argv.slice(2);
  for (const a of raw) {
    const m = a.match(/^--([^=]+)=(.*)$/); if (m) args[m[1]] = m[2]; else if (a.startsWith('--')) args[a.slice(2)] = true;
  }
  return args;
}

function norm(s='') { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

// Simple Levenshtein distance for similarity
function levenshtein(a,b){
  if(a===b) return 0; if(!a) return b.length; if(!b) return a.length;
  const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>new Array(n+1));
  for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){ const cost=a[i-1]===b[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);} return dp[m][n];
}
function similarity(a,b){ const A=norm(a), B=norm(b); if(!A||!B) return 0; const dist=levenshtein(A,B); return 1 - dist/Math.max(A.length,B.length); }

async function fetchRAWG(name, aliases, minScore){
  const key = process.env.RAWG_API_KEY; if(!key) return null;
  const query = encodeURIComponent(name);
  const url = `https://api.rawg.io/api/games?search=${query}&page_size=5&key=${key}`;
  try {
    const res = await fetch(url,{headers:{'Accept':'application/json'}}); if(!res.ok) return null; const json= await res.json();
    if(!json?.results) return null;
    const norms = new Set([norm(name), ...aliases.map(norm)]);
    let best=null, bestScore=0;
    for(const r of json.results){
      const candidates=[r.name, r.slug].filter(Boolean);
      let s=0;
      for(const c of candidates){
        const base = norm(c);
        if(norms.has(base)) { s=1; break; }
        s = Math.max(s, similarity(c, name));
      }
      if(s>bestScore){ bestScore=s; best=r; }
      if(bestScore===1) break;
    }
    if(!best || bestScore < minScore) return null;
    // Detail
    if(best.id){
      const dRes = await fetch(`https://api.rawg.io/api/games/${best.id}?key=${key}`);
      if(dRes.ok){ const detail = await dRes.json();
        const dev = detail.developers?.[0]?.name;
        const pub = detail.publishers?.[0]?.name;
        return { developer: dev, publisher: pub, source: 'rawg', score: bestScore };
      }
    }
    return null;
  } catch { return null; }
}

// Wikipedia extraction: search then fetch wikitext and regex developer/publisher lines
async function fetchWiki(name, aliases){
  const searchQ = encodeURIComponent(name);
  try {
    const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQ}&format=json&utf8=1&origin=*`);
    if(!sRes.ok) return null; const sJson = await sRes.json();
    const first = sJson?.query?.search?.[0]; if(!first) return null;
    const title = first.title;
    const pageTitle = encodeURIComponent(title.replace(/ /g,'_'));
    const revRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=*&formatversion=2&titles=${pageTitle}&format=json&origin=*`);
    if(!revRes.ok) return null; const revJson = await revRes.json();
    const content = revJson?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
    if(!content) return null;
    // Extract infobox lines
    const infoboxMatch = content.match(/\{\{Infobox[\s\S]*?\n\}\}/i);
    const box = infoboxMatch ? infoboxMatch[0] : content;
    const devLine = box.match(/\|\s*developer\s*=([^\n]+)/i);
    const pubLine = box.match(/\|\s*publisher\s*=([^\n]+)/i);
    function clean(v){ if(!v) return undefined; return v.replace(/\{\{.*?\}\}/g,'').replace(/\[\[|\]\]/g,'').replace(/<ref[\s\S]*?>[\s\S]*?<\/ref>/gi,'').replace(/<.*?>/g,'').split('<')[0].split(/<br\s*\/?/i)[0].trim().split(/,|\/|;/)[0].trim(); }
    const developer = clean(devLine?.[1]);
    const publisher = clean(pubLine?.[1]);
    if(!developer && !publisher) return null;
    return { developer, publisher, source: 'wiki', title };
  } catch { return null; }
}

async function enrichOne(brand, sources, minScore){
  const aliases = Array.isArray(brand.aliases)? brand.aliases : [];
  for(const src of sources){
    if(src==='rawg'){
      const data = await fetchRAWG(brand.name, aliases, minScore);
      if(data && (data.developer || data.publisher)) return data;
    } else if (src==='wiki') {
      const data = await fetchWiki(brand.name, aliases);
      if(data && (data.developer || data.publisher)) return data;
    }
  }
  return null;
}

async function main(){
  const args = parseArgs();
  const limit = Number(args.limit || 200);
  const force = 'force' in args;
  const dry = 'dry' in args;
  const minScore = Number(args.minScore || 0.55);
  const sources = (args.sources ? String(args.sources) : 'rawg,wiki').split(/[,]/).map(s=>s.trim()).filter(Boolean);
  const MONGODB_URI = process.env.MONGODB_URI;
  if(!MONGODB_URI){ console.error('Missing MONGODB_URI'); process.exit(1); }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(args.db || 'topupsaas');
  const filter = force ? {} : { $or: [ { developer: { $exists: false } }, { publisher: { $exists: false } } ] };
  const cursor = db.collection('brands').find(filter).limit(limit);
  let scanned=0, updated=0;
  while(await cursor.hasNext()){
    const b = await cursor.next(); if(!b) break; scanned++;
    const already = b.developer || b.publisher;
    const data = await enrichOne(b, sources, minScore);
    if(data){
      const set={}; if(force || !b.developer) set.developer = data.developer || b.developer; if(force || !b.publisher) set.publisher = data.publisher || b.publisher;
      if(Object.keys(set).length){
        if(!dry){
          await db.collection('brands').updateOne({ _id: b._id }, { $set: { ...set, updatedAt: new Date(), enrichmentSource: data.source } });
        }
        updated++;
        console.log('Updated', b.code, set, 'via', data.source);
      } else {
        console.log('Skip (no new fields)', b.code);
      }
    } else {
      console.log('No data', b.code);
    }
    await new Promise(r=>setTimeout(r, 250)); // pacing
  }
  console.log('Done. Scanned:', scanned, 'Updated:', updated, 'Sources order:', sources.join('>'));
  await client.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });
