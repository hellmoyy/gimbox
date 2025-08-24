import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Returns grouped brands for home page (mirroring home-products but brand-level)
export async function GET() {
  try {
    const db = await getDb();
    const col = db.collection('brands');
    const base: any = { isActive: { $ne: false }, name: { $nin: [null,''] } };
    const proj = { projection: { _id: 0, name: 1, code: 1, icon: 1, featured: 1, newRelease: 1, voucher: 1, pulsaTagihan: 1, entertainment: 1 } } as any;
    const [featured, newRelease, voucher, pulsaTagihan, entertainment, all] = await Promise.all([
      col.find({ ...base, featured: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, newRelease: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, voucher: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, pulsaTagihan: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, entertainment: true }, proj).sort({ name: 1 }).toArray(),
      col.find(base, proj).sort({ name: 1 }).limit(120).toArray(),
    ]);
    return NextResponse.json({ success: true, featured, newRelease, voucher, pulsaTagihan, entertainment, all });
  } catch (e:any) {
    return NextResponse.json({ success: false, featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [], error: e?.message || 'Error' }, { status: 500 });
  }
}
