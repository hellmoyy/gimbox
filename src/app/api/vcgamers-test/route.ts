import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getPriceList } from '@/lib/providers/vcgamers';

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
  const started = Date.now();
  const items = await getPriceList();
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
  });
}