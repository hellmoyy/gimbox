import { getDb } from '@/lib/mongodb';
import TopupForm from '@/components/TopupForm';
import SmartImage from '@/components/SmartImage';
import Link from 'next/link';

async function fetchProduct(brand: string, productSlug: string) {
  const db = await getDb();
  // Stored code pattern = brandKey-providerProductCode (already lowercased). Accept both full code & suffix slug.
  const direct = await db.collection('products').findOne({ code: `${brand}-${productSlug}` });
  let prod = direct;
  if (!prod) {
    prod = await db.collection('products').findOne({ code: { $regex: `^${brand}-`, $options: 'i' }, brandKey: brand, $expr: { $eq: [ { $substr: ['$code', { $add: [ { $strLenCP: brand }, 1 ] }, -1 ] }, productSlug ] } } as any);
  }
  if (!prod) return null;
  const variants = Array.isArray(prod.variants) ? prod.variants.filter((v: any) => (v?.isActive ?? true) !== false) : [];
  return { prod, variants };
}

export default async function ProductPage(props: { params: Promise<{ brand: string; product: string }> }) {
  const { brand, product } = await props.params;
  const db = await getDb();
  const brandDoc = await db.collection('brands').findOne({ code: brand });
  const data = await fetchProduct(brand, product);
  if (!brandDoc) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-600">Brand tidak ditemukan.</div>;
  if (!data) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-600">Produk tidak ditemukan.</div>;
  const { prod, variants } = data;
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <nav className="text-[12px] mb-4 text-slate-500 flex items-center gap-1">
        <Link href="/" className="hover:text-slate-700">Home</Link>
        <span>/</span>
        <Link href={`/topup/${brand}`} className="hover:text-slate-700">{brandDoc.name}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{prod.name}</span>
      </nav>
      <div className="flex items-start gap-6 flex-col sm:flex-row">
        <div className="w-full sm:w-48">
          <div className="w-40 h-40 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <SmartImage src={prod.icon || brandDoc.icon || '/images/logo/gimbox.gif'} alt={prod.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 w-full">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{prod.name}</h1>
          {prod.meta?.sla && (
            <div className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-3">SLA: {prod.meta.sla}</div>
          )}
          {/* Use full product code so order & analytics tetap spesifik per produk */}
          <TopupForm code={prod.code} price={prod.price || 0} variants={variants} />
        </div>
      </div>
    </main>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
