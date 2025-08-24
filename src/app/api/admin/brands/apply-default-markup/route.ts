import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ensureAdminRequest } from '@/lib/adminAuth';

// Set all brands with missing or zero defaultMarkupPercent to 1
export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const filter = { $or: [ { defaultMarkupPercent: { $exists: false } }, { defaultMarkupPercent: null }, { defaultMarkupPercent: 0 } ] } as any;
  const toFix = await db.collection('brands').find(filter).project({ code:1, defaultMarkupPercent:1 }).toArray();
  let modified = 0;
  if (!dry && toFix.length) {
    const res = await db.collection('brands').updateMany(filter, { $set: { defaultMarkupPercent: 1, updatedAt: new Date() } });
    modified = res.modifiedCount || 0;
  }
  return NextResponse.json({ dry, candidates: toFix.length, modified, sample: toFix.slice(0,25) });
}
