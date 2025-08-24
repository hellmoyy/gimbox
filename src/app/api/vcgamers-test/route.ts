import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getPriceList } from '@/lib/providers/vcgamers';

// Lightweight replica of internal probing when verbose diagnostics requested
async function probeVerbose(limitTotal = 60, extraPaths: string[] = [], extraQuery: string | null = null) {
  const attempts: any[] = [];
  const apiKey = process.env.VCGAMERS_API_KEY || '';
  if (!apiKey) return { attempts: [{ error: 'VCGAMERS_API_KEY missing in env' }], items: [] };
  const sandbox = (process.env.VCGAMERS_SANDBOX || '').toLowerCase() === 'true';
  const bases = Array.from(new Set([
    (process.env.VCGAMERS_BASE_URL || '').replace(/\/$/, '') || (sandbox ? 'https://sandbox-api.vcgamers.com' : 'https://mitra-api.vcgamers.com'),
    'https://mitra-api.vcgamers.com',
    'https://api.vcgamers.com',
    'https://sandbox-api.vcgamers.com'
  ])).filter(Boolean);
  const baseDefaultPath = (process.env.VCGAMERS_PRICELIST_PATH || '/v1/pricelist').trim();
  // Expanded guess list (common naming variants, singular/plural, hyphen/underscore, versioned + unversioned)
  const guessPaths = [
    baseDefaultPath,
    '/v1/public/pricelist','/v2/pricelist','/v2/products/pricelist','/v2/product/pricelist','/v1/pricelist',
    '/v1/price-list','/v1/price_list','/v1/pricelists','/v1/product/pricelist','/v1/product/pricelists','/v1/products/pricelist','/v1/products/price',
    '/pricelist','/price-list','/products/pricelist','/product/pricelist','/api/v1/pricelist','/api/v1/products/pricelist'
  ];
  const userExtra = extraPaths.map(p => p.startsWith('/') ? p : '/' + p);
  const paths = Array.from(new Set([...guessPaths, ...userExtra]));
  const headerVariants = [
    { name: 'Bearer', headers: { 'Content-Type':'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` } },
    { name: 'X-Api-Key', headers: { 'Content-Type':'application/json', Accept: 'application/json', 'X-Api-Key': apiKey } },
  ];
  const methods = ['GET','POST'];
  let found: any[] = [];
  outer: for (const b of bases) {
    for (const p of paths) {
      for (const hv of headerVariants) {
        for (const method of methods) {
          const qp = extraQuery ? (p.includes('?') ? '&' + extraQuery : p + '?' + extraQuery) : p;
          const url = b + qp;
          const started = Date.now();
          let status = 0; let ok = false; let bodyText = ''; let error: string | undefined;
          try {
            const res = await fetch(url, { method, headers: hv.headers as any, cache: 'no-store', body: method === 'POST' ? JSON.stringify({}) : undefined });
            status = res.status; ok = res.ok;
            bodyText = await res.text();
          } catch (e: any) {
            error = e?.message || String(e);
          }
          let items: any[] = [];
          if (ok) {
            try {
              const json = JSON.parse(bodyText || '{}');
              items = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
            } catch {}
          }
          const notFoundLike = /Cannot GET|Not Found|Route not found/i.test(bodyText) || status === 404;
          attempts.push({ url, method, header: hv.name, ok, status, notFoundLike, items: items.length, ms: Date.now() - started, error, snippet: bodyText.slice(0, 220) });
          if (items.length) {
            found = items;
            break outer;
          }
          if (attempts.length >= limitTotal) break outer;
        }
      }
    }
  }
  return { attempts, items: found };
}

// Returns a small sample of VCGamers pricelist for diagnostics without persisting to DB.
// Secure: only accessible if ensureAdminRequest passes.
// Query params:
//   limit (number) - max items (default 10)
//   raw=true       - include raw first item body snippet
export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10));
  const raw = searchParams.get('raw') === 'true';
  const verbose = searchParams.get('verbose') === 'true' || searchParams.get('debug') === '1';
  const extraPathsParam = searchParams.get('paths');
  const extraPaths = extraPathsParam ? extraPathsParam.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const qParam = searchParams.get('q'); // e.g. q=limit=500
  const mode = (searchParams.get('mode') || '').toLowerCase(); // mode=brands
  const started = Date.now();
  let items: any[] = [];
  let attempts: any[] | undefined;
  if (verbose && mode === 'brands2') {
    // Advanced signature probing for brands endpoint.
    const apiKey = process.env.VCGAMERS_API_KEY || '';
    const secret = process.env.VCGAMERS_SECRET_KEY || '';
    const bases = Array.from(new Set([
      (process.env.VCGAMERS_BASE_URL || '').replace(/\/$/, '') || 'https://mitra-api.vcgamers.com',
      'https://sandbox-api.vcgamers.com'
    ]));
    const ts = Math.floor(Date.now()/1000).toString();
    const path = '/v2/public/brands';
    const combos: Array<{ label: string; raw: string }> = [];
    const push = (l:string,r:string) => combos.push({ label: l, raw: r });
    if (secret) push('secret', secret);
    if (apiKey) push('apiKey', apiKey);
    push('ts', ts);
    if (secret && apiKey) {
      const seqs = [
        ['secret','apiKey','ts'],['apiKey','secret','ts'],['secret','ts','apiKey'],['ts','secret','apiKey'],['apiKey','ts','secret'],['ts','apiKey','secret']
      ];
      for (const s of seqs) push(s.join('+'), s.map(k=>({secret,apiKey,ts}[k as 'secret']||'')).join(''));
      push('path+ts', path+ts);
      push('path+apiKey+ts', path+apiKey+ts);
      push('path+ts+secret', path+ts+secret);
      push('method+path+ts', 'GET'+path+ts);
      push('method+path+apiKey+ts', 'GET'+path+apiKey+ts);
      push('ts+path', ts+path);
      push('apiKey+path+ts', apiKey+path+ts);
    }
    const signatures: Array<{ label:string; value:string; placement:'query'|'header' }> = [];
    const seen = new Set<string>();
    for (const c of combos) {
      const basesig = [
        { label: c.label+':hmacSHA256', value: crypto.createHmac('sha256', secret||apiKey||'x').update(c.raw).digest('hex') },
        { label: c.label+':hmacSHA256:UP', value: crypto.createHmac('sha256', secret||apiKey||'x').update(c.raw).digest('hex').toUpperCase() },
        { label: c.label+':sha256', value: crypto.createHash('sha256').update(c.raw).digest('hex') },
        { label: c.label+':md5', value: crypto.createHash('md5').update(c.raw).digest('hex') },
        { label: c.label+':sha1', value: crypto.createHash('sha1').update(c.raw).digest('hex') },
        { label: c.label+':b64', value: Buffer.from(c.raw).toString('base64') },
        { label: c.label+':raw', value: c.raw }
      ];
      for (const sig of basesig) {
        if (!seen.has(sig.value)) {
          seen.add(sig.value);
          signatures.push({ label: sig.label, value: sig.value, placement: 'query' });
          signatures.push({ label: sig.label+'#hdr', value: sig.value, placement: 'header' });
        }
        if (signatures.length > 160) break;
      }
      if (signatures.length > 160) break;
    }
    attempts = [];
    outerAdv: for (const b of bases) {
      for (const sig of signatures) {
        const queryBase = `${b}${path}?ts=${ts}`;
        const url = sig.placement === 'query' ? `${queryBase}&sign=${encodeURIComponent(sig.value)}` : queryBase;
        const headers: Record<string,string> = { Authorization: `Bearer ${apiKey}`, 'X-Timestamp': ts };
        if (sig.placement === 'header') headers['X-Signature'] = sig.value;
        const started = Date.now();
        let status=0; let ok=false; let body=''; let error: string|undefined;
        try { const res = await fetch(url,{ headers }); status=res.status; ok=res.ok; body=await res.text(); } catch(e:any){ error=e?.message||String(e); }
        let brandItems: any[] = [];
        if (ok) { try { const json = JSON.parse(body||'{}'); brandItems = Array.isArray(json?.data)?json.data:(Array.isArray(json)?json:[]); } catch{} }
        attempts.push({ url, sigLabel: sig.label, placement: sig.placement, status, ok, items: brandItems.length, ms: Date.now()-started, snippet: body.slice(0,180) });
        if (brandItems.length) { items = brandItems; break outerAdv; }
        if (attempts.length >= 220) break outerAdv;
      }
    }
    if (Array.isArray(items)) {
      items = items.map(it => ({ code: String(it.code || it.brand_code || it.id || ''), name: String(it.name || it.brand_name || ''), cost: 0, icon: it.logo || it.icon, category: it.category }));
    }
  } else if (verbose && mode === 'brands') {
    // Probe brand listing endpoint: /v2/public/brands?sign=...
    const apiKey = process.env.VCGAMERS_API_KEY || '';
    const secret = process.env.VCGAMERS_SECRET_KEY || '';
    const bases = Array.from(new Set([
      (process.env.VCGAMERS_BASE_URL || '').replace(/\/$/, '') || 'https://mitra-api.vcgamers.com',
      'https://mitra-api.vcgamers.com',
      'https://sandbox-api.vcgamers.com'
    ]));
    const signCandidates: Array<{label:string;value:string}> = [];
    if (secret) signCandidates.push({ label: 'secret', value: secret });
    if (apiKey) signCandidates.push({ label: 'apiKey', value: apiKey });
    if (apiKey && secret) {
      signCandidates.push({ label: 'hmac(secret,apiKey)', value: crypto.createHmac('sha256', secret).update(apiKey).digest('hex') });
      signCandidates.push({ label: 'hmac(apiKey,secret)', value: crypto.createHmac('sha256', apiKey).update(secret).digest('hex') });
      const ts = Math.floor(Date.now()/1000).toString();
      signCandidates.push({ label: 'hmac(secret,timestamp)', value: crypto.createHmac('sha256', secret).update(ts).digest('hex') });
      signCandidates.push({ label: 'hmac(secret,empty)', value: crypto.createHmac('sha256', secret).update('').digest('hex') });
      signCandidates.push({ label: 'hmac(secret,apiKey+timestamp)', value: crypto.createHmac('sha256', secret).update(apiKey+ts).digest('hex') });
      signCandidates.push({ label: 'hmac(secret,timestamp+apiKey)', value: crypto.createHmac('sha256', secret).update(ts+apiKey).digest('hex') });
      signCandidates.push({ label: 'hmac(secret,apiKey|timestamp)', value: crypto.createHmac('sha256', secret).update(apiKey+':'+ts).digest('hex') });
      // SHA1 variants
      signCandidates.push({ label: 'sha1(secret+apiKey)', value: crypto.createHash('sha1').update(secret+apiKey).digest('hex') });
      signCandidates.push({ label: 'sha1(apiKey+secret)', value: crypto.createHash('sha1').update(apiKey+secret).digest('hex') });
      // MD5 variants (kadang beberapa provider lama pakai md5)
      signCandidates.push({ label: 'md5(secret+apiKey)', value: crypto.createHash('md5').update(secret+apiKey).digest('hex') });
      signCandidates.push({ label: 'md5(apiKey+secret)', value: crypto.createHash('md5').update(apiKey+secret).digest('hex') });
      signCandidates.push({ label: 'md5(apiKey)', value: crypto.createHash('md5').update(apiKey).digest('hex') });
      signCandidates.push({ label: 'md5(secret)', value: crypto.createHash('md5').update(secret).digest('hex') });
      // Uppercase versions (beberapa API minta uppercase)
      signCandidates.push({ label: 'hmac(secret,apiKey).upper', value: crypto.createHmac('sha256', secret).update(apiKey).digest('hex').toUpperCase() });
      signCandidates.push({ label: 'md5(secret+apiKey).upper', value: crypto.createHash('md5').update(secret+apiKey).digest('hex').toUpperCase() });
    }
    if (!signCandidates.length) signCandidates.push({ label: 'placeholder', value: 'your-signature-key' });
    attempts = [];
    const brandPaths = ['/v2/public/brands','/v2/brands','/v1/brands'];
    // sign parameter names to attempt
    const signParamNames = ['sign','signature'];
    const perBaseLimit = Math.ceil(80 / bases.length);
    outerBrands: for (const b of bases) {
      let baseAttempts = 0;
      for (const pathBase of brandPaths) {
        for (const signName of signParamNames) {
          for (const sc of signCandidates) {
            const path = `${pathBase}?${signName}=${encodeURIComponent(sc.value)}`;
            const url = b + path;
            const started = Date.now();
            let status = 0; let ok = false; let bodyText=''; let error: string | undefined;
            try {
              const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}` }});
              status = res.status; ok = res.ok; bodyText = await res.text();
            } catch(e:any){ error = e?.message || String(e); }
            let brandItems: any[] = [];
            if (ok) {
              try {
                const json = JSON.parse(bodyText||'{}');
                brandItems = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
              } catch {}
            }
            attempts.push({ url, signLabel: sc.label, signParam: signName, ok, status, items: brandItems.length, ms: Date.now()-started, error, snippet: bodyText.slice(0,240) });
            baseAttempts++;
            if (brandItems.length) {
              items = brandItems.map(it => ({ code: String(it.code || it.brand_code || it.id || ''), name: String(it.name || it.brand_name || ''), cost: 0, icon: it.logo || it.icon, category: it.category }));
              break outerBrands;
            }
            if (baseAttempts >= perBaseLimit) break;
            if (attempts.length >= 80) break outerBrands;
          }
        }
        if (attempts.length >= 80 || baseAttempts >= perBaseLimit) break;
      }
    }
  } else if (verbose) {
    const diag = await probeVerbose(80, extraPaths, qParam);
    attempts = diag.attempts;
    items = diag.items.map(it => ({
      code: String(it.code || it.sku || it.product_code || ''),
      name: String(it.name || it.product_name || it.title || ''),
      cost: Number(it.price || it.cost || 0),
      icon: it.icon || it.image,
      category: it.category,
    }));
  } else {
    items = await getPriceList();
  }
  const durMs = Date.now() - started;
  const placeholder = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';
  const sample = items.slice(0, limit).map(it => ({
    code: it.code,
    name: it.name,
    cost: it.cost,
    icon: it.icon && String(it.icon).trim() !== '' ? it.icon : '(placeholder)',
    finalIcon: it.icon && String(it.icon).trim() !== '' ? it.icon : placeholder,
    category: it.category || null,
  }));
  return NextResponse.json({
    success: true,
    count: items.length,
    sampleCount: sample.length,
    durationMs: durMs,
    placeholder,
    sample,
    note: 'Data tidak tersimpan. Gunakan endpoint import/sync untuk menulis ke DB.',
    rawFirst: raw && items[0] ? items[0] : undefined,
    attempts: verbose ? attempts : undefined,
    env: verbose ? {
      sandbox: (process.env.VCGAMERS_SANDBOX||'').toString(),
      baseOverride: process.env.VCGAMERS_BASE_URL || null,
      pathOverride: process.env.VCGAMERS_PRICELIST_PATH || null,
      hasApiKey: !!process.env.VCGAMERS_API_KEY,
      extraPaths,
      extraQuery: qParam || null,
      mode: mode || 'pricelist',
      hasSecret: !!process.env.VCGAMERS_SECRET_KEY,
    } : undefined,
  });
}