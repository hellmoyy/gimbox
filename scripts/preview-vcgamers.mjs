// Quick preview script to fetch a few VCGamers products before full import
// Usage (env via .env.local or inline):
//   VCGAMERS_API_KEY=xxx VCGAMERS_SECRET_KEY=yyy node scripts/preview-vcgamers.mjs [limit]
// Optional env:
//   VCGAMERS_SANDBOX=true            # use sandbox endpoint
//   VCGAMERS_BASE_URL=...            # override base URL
//   VCGAMERS_PRICELIST_PATH=/v1/pricelist
//   PRODUCT_PLACEHOLDER_URL=https://cdn.gimbox.id/placeholder.webp
//   TIMEOUT_MS=15000
//
// Prints first N normalized items: code, name, cost, icon(or placeholder tag).
/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// --- minimal dotenv loader (same as test script) ---
(function loadDotEnvFiles(){
  const root = process.cwd();
  for (const f of ['.env.local','.env']) {
    const file = path.join(root, f);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file,'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line || /^\s*#/.test(line)) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1]; let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
      if (!(key in process.env)) process.env[key] = val;
    }
  }
})();

const LIMIT = Number(process.argv[2] || process.env.LIMIT || 10);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15000);
const PLACEHOLDER = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';

function env(name, def=''){ const v = process.env[name]; return typeof v==='string' && v.length ? v : def; }

function baseUrl(){
  const override = env('VCGAMERS_BASE_URL').trim();
  if (override) return override.replace(/\/$/,'');
  const sandbox = env('VCGAMERS_SANDBOX').toLowerCase()==='true';
  return sandbox ? 'https://sandbox-api.vcgamers.com' : 'https://mitra-api.vcgamers.com';
}

function candidatePaths(){
  const p = env('VCGAMERS_PRICELIST_PATH') || '/v1/pricelist';
  return Array.from(new Set([p,'/v1/public/pricelist','/v2/pricelist','/v2/products/pricelist','/v2/product/pricelist','/v1/pricelist']));
}

function headerVariants(){
  const apiKey = env('VCGAMERS_API_KEY');
  if (!apiKey) throw new Error('VCGAMERS_API_KEY belum di-set');
  return [
    { name: 'Bearer', headers: { 'Content-Type':'application/json', Accept:'application/json', Authorization:`Bearer ${apiKey}` } },
    { name: 'X-Api-Key', headers: { 'Content-Type':'application/json', Accept:'application/json', 'X-Api-Key': apiKey } },
  ];
}

async function fetchWithTimeout(url, opts={}){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(new Error('timeout')), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url,{...opts, signal: controller.signal});
    const ms = Date.now()-started;
    const txt = await res.text().catch(()=> '');
    return { ok:res.ok, status:res.status, ms, body:txt };
  } catch(e){
    return { ok:false, status:0, error:e, ms: Date.now()-started };
  } finally { clearTimeout(id); }
}

function normalizeItems(data){
  const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  if (!Array.isArray(arr)) return [];
  return arr.map(it=>({
    code: String(it.code || it.sku || it.product_code || ''),
    name: String(it.name || it.product_name || it.title || ''),
    cost: Number(it.price || it.cost || 0),
    icon: it.icon || it.image || '',
    category: it.category || ''
  })).filter(i=>i.code && i.name);
}

async function main(){
  console.log('== VCGAMERS PREVIEW ==');
  console.log('Base candidates starting from:', baseUrl());
  console.log('Limit:', LIMIT);
  const paths = candidatePaths();
  const bases = Array.from(new Set([baseUrl(),'https://mitra-api.vcgamers.com','https://api.vcgamers.com','https://sandbox-api.vcgamers.com']));
  const headers = headerVariants();
  const tried = [];
  for (const b of bases){
    for (const p of paths){
      for (const hv of headers){
        const url = b + p;
        tried.push(url+'#'+hv.name);
        const r = await fetchWithTimeout(url,{ method:'GET', headers: hv.headers, cache:'no-store' });
        if (!r.ok){
          console.log('MISS', r.status, url, '['+hv.name+']');
          continue;
        }
        let data = null;
        try { data = JSON.parse(r.body||'{}'); } catch {}
        const items = normalizeItems(data);
        if (!items.length){
          console.log('EMPTY', url, '['+hv.name+']');
          continue;
        }
        console.log('HIT', items.length,'items via', url,'['+hv.name+'] in', r.ms+'ms');
        const sample = items.slice(0, LIMIT).map((it,i)=>({
          i: i+1,
          code: it.code,
          name: it.name,
          cost: it.cost,
          icon: it.icon ? (it.icon.startsWith('http')? it.icon : '(relative)') : '(placeholder)',
          finalIcon: (it.icon && String(it.icon).trim() !== '') ? it.icon : PLACEHOLDER,
        }));
        console.table(sample);
        console.log('\nPlaceholder used for', sample.filter(s=>s.icon==='(placeholder)').length,'of', sample.length, 'shown.');
        console.log('\nTo import: call syncProvider("vcgamers") inside a route or add an admin action.');
        return;
      }
    }
  }
  console.log('\nAll attempts failed. Tried', tried.length,'combos. Set VCGAMERS_BASE_URL or adjust paths.');
}

main().catch(e=>{ console.error('Fatal:', e); process.exit(1); });
