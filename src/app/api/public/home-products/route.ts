import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const col = db.collection('products');
    const base = { isActive: { $ne: false }, name: { $nin: [null, ''] } };
  const project = { projection: { _id: 0, name: 1, code: 1, icon: 1, category: 1, categories: 1, featured: 1 } } as any;
    const [featured, newRelease, voucher, pulsaTagihan, entertainment, all] = await Promise.all([
      col.find({ ...base, featured: true }, project).sort({ name: 1 }).toArray(),
      col.find({ ...base, newRelease: true }, project).sort({ name: 1 }).toArray(),
      col.find({ ...base, voucher: true }, project).sort({ name: 1 }).toArray(),
      col.find({ ...base, pulsaTagihan: true }, project).sort({ name: 1 }).toArray(),
      col.find({ ...base, entertainment: true }, project).sort({ name: 1 }).toArray(),
  col.find({ ...base, $or: [ { categories: 'semua-produk' }, { category: { $exists: true } } ] }, project).sort({ name: 1 }).limit(100).toArray(),
    ]);
    return NextResponse.json({ success: true, featured, newRelease, voucher, pulsaTagihan, entertainment, all });
  } catch (e: any) {
    return NextResponse.json({ success: false, featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [], error: e?.message || 'Error' }, { status: 500 });
  }
}
