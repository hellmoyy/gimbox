import Link from 'next/link';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export default function NewBrand() {
  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brand Baru</h1>
        <Link href="/admin/brands" className="text-sm text-slate-600 hover:underline">Kembali</Link>
      </div>
      <form action="/api/admin/brands/create" method="post" className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input name="code" required className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nama</label>
          <input name="name" required className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Markup %</label>
          <input name="defaultMarkupPercent" type="number" step="0.01" className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Icon URL</label>
          <input name="icon" placeholder="Kosongkan untuk pakai placeholder" className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          <p className="text-xs text-slate-500 mt-1">Default: placeholder global.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Developer</label>
            <input name="developer" className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Publisher</label>
            <input name="publisher" className="w-full border rounded px-3 py-2 bg-[#fefefe]" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Aliases (pisah dengan koma / enter)</label>
          <textarea name="aliases" className="w-full border rounded px-3 py-2 bg-[#fefefe] h-20" placeholder="mlbb, mobile-legends, moba-ml" />
          <p className="text-xs text-slate-500 mt-1">Otomatis dinormalisasi (lowercase, strip). Digunakan untuk pencarian & penyatuan brand.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Provider Refs (format: provider:code1|code2;provider2:codeA)</label>
          <textarea name="providerRefs" className="w-full border rounded px-3 py-2 bg-[#fefefe] h-20" placeholder="vcgamers:ml;digiflazz:mlbb|ml-legends" />
          <p className="text-xs text-slate-500 mt-1">Mapping kode brand pada masing-masing provider.</p>
        </div>
        <div className="flex items-center gap-2">
          <input id="isActive" name="isActive" type="checkbox" defaultChecked />
          <label htmlFor="isActive" className="text-sm">Aktif</label>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Kategori Home (Brand ditampilkan di seksi ini)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="featured" /> <span>Populer</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="newRelease" /> <span>Baru Rilis</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="voucher" /> <span>Voucher</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="pulsaTagihan" /> <span>Pulsa & Tagihan</span></label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="entertainment" /> <span>Entertainment</span></label>
          </div>
          <p className="text-xs text-slate-500 mt-1">Centang seksi home tempat brand ini ingin muncul (ke depannya akan dipakai render brand bukan produk).</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Urutan Populer (angka kecil tampil lebih dulu)</label>
          <input name="featuredOrder" type="number" min="0" className="w-full border rounded px-3 py-2 bg-[#fefefe]" placeholder="Kosongkan jika tidak diatur" />
          <p className="text-xs text-slate-500 mt-1">Hanya dipakai jika brand dicentang sebagai Populer.</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded">Simpan</button>
      </form>
    </div>
  );
}
