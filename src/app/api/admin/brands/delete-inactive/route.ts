import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await getDb();
  const body = await req.json().catch(()=>({})) as any;
  const mergedOnly = body?.mergedOnly !== false; // default true
  const dry = body?.dry === true;
  const filter: any = { isActive: false };
  if (mergedOnly) filter.mergedInto = { $exists: true };
  const toDelete = await db.collection('brands').find(filter).project({ _id:1, code:1, mergedInto:1 }).toArray();
  let deleted = 0;
  if (!dry && toDelete.length) {
    const ids = toDelete.map(d=>d._id);
    const res = await db.collection('brands').deleteMany({ _id: { $in: ids } });
    deleted = res.deletedCount || 0;
  }
  return NextResponse.json({ ok:true, dry, mergedOnly, matched: toDelete.length, deleted, sample: toDelete.slice(0,20).map(d=>({ code: d.code, mergedInto: d.mergedInto })) });
}
