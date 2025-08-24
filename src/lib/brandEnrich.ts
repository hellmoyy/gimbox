// On-the-fly enrichment for developer/publisher.
// Supports multi-sources controlled by ENRICH_SOURCES env (comma list): rawg,wiki
// If ENRICH_SOURCES not set, falls back to: rawg,wiki
// Keep calls light: invoked only when fields missing.
const RAWG_KEY = process.env.RAWG_API_KEY;
const ENRICH_SOURCES = (process.env.ENRICH_SOURCES || 'rawg,wiki')
  .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

// --- RAWG ---
export async function fetchRawgDevPub(name: string): Promise<{developer?: string; publisher?: string} | null> {
  if (!RAWG_KEY || !name) return null;
  try {
    const query = encodeURIComponent(name);
    const res = await fetch(`https://api.rawg.io/api/games?search=${query}&page_size=3&key=${RAWG_KEY}`, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json?.results?.length) return null;
    const candidates = json.results as any[];
    const targetNorm = norm(name);
    let pick = candidates[0];
    for (const c of candidates) {
      if (norm(c.slug||'') === targetNorm || norm(c.name||'') === targetNorm) { pick = c; break; }
    }
    if (!pick?.id) return null;
    const dRes = await fetch(`https://api.rawg.io/api/games/${pick.id}?key=${RAWG_KEY}`);
    if (!dRes.ok) return null;
    const detail: any = await dRes.json();
    const dev = detail.developers?.[0]?.name;
    const pub = detail.publishers?.[0]?.name;
    if (dev || pub) return { developer: dev, publisher: pub };
    return null;
  } catch {
    return null;
  }
}

// --- Wikipedia ---
// Basic extraction: search page then fetch wikitext to parse | developer(s) | publisher(s)
export async function fetchWikiDevPub(name: string): Promise<{developer?: string; publisher?: string} | null> {
  if (!name) return null;
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=5`;
    const sRes = await fetch(searchUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!sRes.ok) return null;
    const sJson: any = await sRes.json();
    const hits: any[] = sJson?.query?.search || [];
    if (!hits.length) return null;
    // naive pick: first hit whose title contains the searched name tokens
    const tokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let pick = hits[0];
    for (const h of hits) {
      const t = String(h.title||'').toLowerCase();
      if (tokens.every(tok=>t.includes(tok))) { pick = h; break; }
    }
    if (!pick?.pageid) return null;
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=parse&pageid=${pick.pageid}&prop=wikitext&format=json`;
    const pRes = await fetch(pageUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!pRes.ok) return null;
    const pJson: any = await pRes.json();
    const wikitext: string = pJson?.parse?.wikitext?.['*'];
    if (!wikitext) return null;
    const devMatch = wikitext.match(/\|\s*developer[s]?\s*=\s*([^\n]+)/i);
    const pubMatch = wikitext.match(/\|\s*publisher[s]?\s*=\s*([^\n]+)/i);
    function clean(val?: string) {
      if (!val) return undefined;
      // remove templates {{ }} and refs <ref> </ref>
      let out = val.replace(/<ref[^>]*?>[\s\S]*?<\/ref>/gi,'')
                   .replace(/{{[^{}]*}}/g,'')
                   .replace(/\([^)]*\)/g,'')
                   .replace(/\[[^[\]]*\|([^\]]+)\]/g,'$1') // [[Link|Text]] -> Text
                   .replace(/\[\[([^\]]+)\]\]/g,'$1')
                   .replace(/<[^>]+>/g,'')
                   .replace(/&amp;/g,'&');
      // split by <br>, commas, or ' and '
      out = out.split(/<br\s*\/?|,|;|\band\b/i).map(s=>s.trim()).filter(Boolean)[0] || '';
      out = out.replace(/^\s*[:\-–]\s*/, '').trim();
      return out || undefined;
    }
    const developer = clean(devMatch?.[1]);
    const publisher = clean(pubMatch?.[1]);
    if (developer || publisher) return { developer, publisher };
    return null;
  } catch {
    return null;
  }
}

// Orchestrator using ENRICH_SOURCES order
export async function fetchDevPub(name: string): Promise<{developer?: string; publisher?: string} | null> {
  for (const src of ENRICH_SOURCES) {
    let res: {developer?: string; publisher?: string} | null = null;
    if (src === 'rawg') res = await fetchRawgDevPub(name);
    else if (src === 'wiki' || src === 'wikipedia') res = await fetchWikiDevPub(name);
    if (res && (res.developer || res.publisher)) return res;
  }
  return null;
}

