import { getDb } from '@/lib/mongodb';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getBrand(code: string) {
  try {
    const db = await getDb();
    return await db.collection('brands').findOne({ code });
  } catch {
    return null;
  }
}

// Page component: accept params (await if it's a Promise for forward-compat)
export default async function BrandDetail(props: { params: any }) {
  const raw = props.params;
  const p = raw && typeof raw.then === 'function' ? await raw : raw;
  const brand = await getBrand(p?.code);
  if (!brand) return notFound();
  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Brand: {brand.name}</h1>
        <Link href="/admin/brands" className="text-sm text-slate-600 hover:underline">Kembali</Link>
      </div>
      <form action={`/api/admin/brands/${encodeURIComponent(brand.code)}`} method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nama</label>
          <input name="name" defaultValue={brand.name || ''} className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Icon URL</label>
          <input name="icon" defaultValue={brand.icon || ''} placeholder="Kosongkan untuk placeholder" className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          <div className="mt-1 flex items-center gap-2">
            {brand.icon && <img src={brand.icon} alt="icon" className="w-10 h-10 object-cover rounded border" />}
            {!brand.icon && <span className="text-xs text-slate-500">(menggunakan placeholder)</span>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Markup %</label>
          <input name="defaultMarkupPercent" type="number" step="0.01" defaultValue={brand.defaultMarkupPercent ?? ''} className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Developer</label>
            <input name="developer" defaultValue={brand.developer || ''} className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          </div>
            <div>
            <label className="block text-sm font-medium mb-1">Publisher</label>
            <input name="publisher" defaultValue={brand.publisher || ''} className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="isActive" name="isActive" type="checkbox" defaultChecked={brand.isActive !== false} />
          <label htmlFor="isActive" className="text-sm">Aktif</label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Aliases</label>
          <textarea name="aliases" defaultValue={(brand.aliases || []).join(', ')} className="w-full border rounded px-3 py-2 bg-[#fefefe] h-20" />
          <p className="text-xs text-slate-500 mt-1">Pisahkan dengan koma atau baris baru.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Provider Refs</label>
          <textarea name="providerRefs" defaultValue={brand.providerRefs ? Object.entries(brand.providerRefs).map(([prov,codes]: any)=>`${prov}:${codes.join('|')}`).join(';') : ''} className="w-full border rounded px-3 py-2 bg-[#fefefe] h-20" />
          <p className="text-xs text-slate-500 mt-1">Format: provider:code1|code2;provider2:codeA</p>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Kategori Home</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={brand.featured === true} /> <span>Populer</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="newRelease" defaultChecked={brand.newRelease === true} /> <span>Baru Rilis</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="voucher" defaultChecked={brand.voucher === true} /> <span>Voucher</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="pulsaTagihan" defaultChecked={brand.pulsaTagihan === true} /> <span>Pulsa & Tagihan</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="entertainment" defaultChecked={brand.entertainment === true} /> <span>Entertainment</span></label>
          </div>
          <p className="text-xs text-slate-500 mt-1">Atur di seksi home mana brand muncul.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Urutan Populer</label>
          <input name="featuredOrder" type="number" min="0" defaultValue={brand.featuredOrder ?? ''} className="w-full border rounded px-3 py-2 bg-[#fefefe]" placeholder="Kosongkan" />
          <p className="text-xs text-slate-500 mt-1">Jika diisi dan brand Populer, angka kecil akan tampil lebih awal.</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded">Simpan</button>
      </form>
    </div>
  );
}
