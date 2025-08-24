import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getPriceList } from '@/lib/providers/vcgamers';

// Lightweight replica of internal probing when verbose diagnostics requested
async function probeVerbose(limitTotal = 30) {
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
  const paths = Array.from(new Set([
    (process.env.VCGAMERS_PRICELIST_PATH || '/v1/pricelist').trim(),
    '/v1/public/pricelist','/v2/pricelist','/v2/products/pricelist','/v2/product/pricelist','/v1/pricelist'
  ]));
  const headerVariants = [
    { name: 'Bearer', headers: { 'Content-Type':'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` } },
    { name: 'X-Api-Key', headers: { 'Content-Type':'application/json', Accept: 'application/json', 'X-Api-Key': apiKey } },
  ];
  let found: any[] = [];
  outer: for (const b of bases) {
    for (const p of paths) {
      for (const hv of headerVariants) {
        const url = b + p;
        const started = Date.now();
        let status = 0; let ok = false; let bodyText = ''; let error: string | undefined;
        try {
          const res = await fetch(url, { method: 'GET', headers: hv.headers as any, cache: 'no-store' });
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
        attempts.push({ url, header: hv.name, ok, status, items: items.length, ms: Date.now() - started, error, snippet: bodyText.slice(0, 140) });
        if (items.length) {
          found = items;
          break outer; // stop at first success to keep response small
        }
        if (attempts.length >= limitTotal) break outer;
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
  const started = Date.now();
  let items: any[] = [];
  let attempts: any[] | undefined;
  if (verbose) {
    const diag = await probeVerbose(40);
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
    } : undefined,
  });
}