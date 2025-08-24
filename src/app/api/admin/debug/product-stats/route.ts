import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminRequest } from '@/lib/adminAuth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const provider = req.nextUrl.searchParams.get('provider') || 'vcgamers';
  const brandFilter = req.nextUrl.searchParams.get('brand');
  const match: any = { provider };
  if (brandFilter) match.brandKey = brandFilter;
  const pipeline: any[] = [
    { $match: match },
    { $group: { _id: '$brandKey', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
    { $sort: { active: -1, total: -1 } }
  ];
  const byBrand = await db.collection('products').aggregate(pipeline).toArray();
  const totalAll = byBrand.reduce((a,b)=>a+b.total,0);
  const totalActiveAll = byBrand.reduce((a,b)=>a+b.active,0);
  // Also include recent sync log
  const lastLog = await db.collection('provider_sync_logs').find({ provider }).sort({ finishedAt: -1 }).limit(1).toArray();
  return NextResponse.json({ provider, totalBrands: byBrand.length, totalProducts: totalAll, totalActive: totalActiveAll, brands: byBrand, lastSync: lastLog[0] || null });
}
