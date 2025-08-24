import { getDb } from '@/lib/mongodb';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';

async function fetchBrandAndProducts(brand: string) {
  const db = await getDb();
  const brandDoc = await db.collection('brands').findOne({ code: brand });
  if (!brandDoc) return { brand: null, products: [] };
  const products = await db.collection('products')
    .find({ brandKey: brand, isActive: true })
    .project({ code: 1, name: 1, icon: 1, price: 1, brandKey: 1 })
    .sort({ price: 1, name: 1 })
    .limit(200)
    .toArray();
  return { brand: brandDoc, products };
}

export default async function BrandTopupPage(props: { params: Promise<{ brand: string }> }) {
  const { brand } = await props.params;
  const { brand: brandDoc, products } = await fetchBrandAndProducts(brand);
  if (!brandDoc) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-600">Brand tidak ditemukan.</div>;
  }
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandDoc.icon || '/images/logo/gimbox.gif'} alt={brandDoc.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Topup {brandDoc.name}</h1>
          <div className="text-sm text-slate-500">Pilih item/denom untuk lanjut ke checkout.</div>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="text-sm text-slate-500">Belum ada produk aktif untuk brand ini.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p: any) => (
            <Link key={p.code} href={`/topup/${brand}/${p.code.replace(/^[^/]+-/, '')}`} className="group rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-sm p-3 flex flex-col items-center transition">
              <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 bg-slate-100 flex items-center justify-center">
                <SmartImage src={p.icon || '/images/logo/gimbox.gif'} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-[13px] font-medium text-slate-800 text-center line-clamp-2 leading-snug">{p.name}</div>
              {p.price != null && (
                <div className="mt-1 text-[12px] font-semibold text-blue-600">Rp {Number(p.price).toLocaleString()}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
