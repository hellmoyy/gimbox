import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { fullSyncVCGamers } from '@/lib/providerSync';

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const deactivateMissing = body.deactivateMissing !== false; // default true
  const markupPercent = typeof body.markupPercent === 'number' ? body.markupPercent : undefined;
  try {
    const log = await fullSyncVCGamers({ deactivateMissing, markupPercent });
    return NextResponse.json({ success: true, ...log });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}
