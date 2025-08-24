import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { fetchDevPub } from '@/lib/brandEnrich';

// Bulk enrichment for developer/publisher where missing.
// Query params:
//   limit (number) optional
//   dry=1 for preview
export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dry = req.nextUrl.searchParams.get('dry') === '1';
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(500, Number(limitParam))) : 100;
  const db = await getDb();
  const cursor = db.collection('brands').find({ $or: [ { developer: { $in: [null, '', undefined] } }, { publisher: { $in: [null, '', undefined] } } ], isActive: { $ne: false } }).project({ code:1, name:1, developer:1, publisher:1 }).limit(limit);
  const targets: any[] = await cursor.toArray();
  const results: any[] = [];
  for (const b of targets) {
    try {
      const enriched = await fetchDevPub(b.name || b.code);
      if (enriched && (enriched.developer || enriched.publisher)) {
        results.push({ code: b.code, before: { developer: b.developer, publisher: b.publisher }, after: enriched });
        if (!dry) {
          const set: any = { updatedAt: new Date() };
            if (enriched.developer && !b.developer) set.developer = enriched.developer;
            if (enriched.publisher && !b.publisher) set.publisher = enriched.publisher;
          await db.collection('brands').updateOne({ code: b.code }, { $set: set });
        }
      }
    } catch {}
  }
  return NextResponse.json({ dry, scanned: targets.length, enriched: results.length, results: results.slice(0,25) });
}
