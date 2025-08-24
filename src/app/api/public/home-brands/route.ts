import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Returns grouped brands for home page (mirroring home-products but brand-level)
export async function GET() {
  try {
    const db = await getDb();
    const col = db.collection('brands');
    const base: any = { isActive: { $ne: false }, name: { $nin: [null,''] } };
    const proj = { projection: { _id: 0, name: 1, code: 1, icon: 1, featured: 1, newRelease: 1, voucher: 1, pulsaTagihan: 1, entertainment: 1, featuredOrder: 1, newReleaseOrder: 1, voucherOrder: 1, pulsaTagihanOrder: 1, entertainmentOrder: 1 } } as any;
    const [featuredRaw, newReleaseRaw, voucherRaw, pulsaTagihanRaw, entertainmentRaw, all] = await Promise.all([
      col.find({ ...base, featured: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, newRelease: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, voucher: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, pulsaTagihan: true }, proj).sort({ name: 1 }).toArray(),
      col.find({ ...base, entertainment: true }, proj).sort({ name: 1 }).toArray(),
      col.find(base, proj).sort({ name: 1 }).limit(120).toArray(),
    ]);
    function sortBy(list:any[], field:string) {
      return list.sort((a:any,b:any)=>{
        const av = typeof a[field] === 'number' ? a[field] : 999999;
        const bv = typeof b[field] === 'number' ? b[field] : 999999;
        if (av !== bv) return av - bv;
        return a.name.localeCompare(b.name);
      });
    }
    const featured = sortBy(featuredRaw, 'featuredOrder');
    const newRelease = sortBy(newReleaseRaw, 'newReleaseOrder');
    const voucher = sortBy(voucherRaw, 'voucherOrder');
    const pulsaTagihan = sortBy(pulsaTagihanRaw, 'pulsaTagihanOrder');
    const entertainment = sortBy(entertainmentRaw, 'entertainmentOrder');
    return NextResponse.json({ success: true, featured, newRelease, voucher, pulsaTagihan, entertainment, all });
  } catch (e:any) {
    return NextResponse.json({ success: false, featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [], error: e?.message || 'Error' }, { status: 500 });
  }
}
