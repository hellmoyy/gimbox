import { ObjectId } from "mongodb";
import Link from "next/link";
import { getDb } from "../../../../lib/mongodb";
import VariantsEditor from "@/components/admin/VariantsEditor";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ProductEditor({ params }: Params) {
  const { id } = await params;
  const creating = id === "new";
  const db = await getDb();
  let item: any = null;
  if (!creating) {
    try {
      item = await db.collection("products").findOne({ _id: new ObjectId(id) });
    } catch {
      // ignore invalid id
    }
  }

  const action = creating ? "/api/admin/products" : `/api/admin/products/${id}`;
  // Fetch brands for selection
  const brands = await db.collection('brands').find({ isActive: { $ne: false } }).project({ _id:1, code:1, name:1 }).sort({ name:1 }).toArray();

  return (
  <main className="">
  <div className="w-full">
        <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold text-slate-900">{creating ? "Tambah Produk" : `Edit: ${item?.name || "Produk"}`}</h1>
      <Link href="/admin/products" className="text-sm text-slate-700">← Kembali</Link>
        </div>

      <form action={action} method="post" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-900">Nama Paket / Nominal</label>
            <input name="name" defaultValue={item?.name || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" required />
            <p className="text-[11px] text-slate-500 mt-1">Contoh: 86 Diamonds, Weekly Pass, 120 UC</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Brand (Game)</label>
            <select name="brandKey" defaultValue={item?.brandKey || brands[0]?.code} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-[#fefefe] text-slate-900" required>
              {brands.map((b:any)=>(<option key={b._id} value={b.code}>{b.name}</option>))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Icon & kategori otomatis dari brand.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Kode (opsional)</label>
            <input name="code" defaultValue={item ? item.code.replace(/^.*?-/, '') : ''} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-[#fefefe] text-slate-900" placeholder="Jika kosong diambil dari nama" />
            <p className="text-[11px] text-slate-500 mt-1">Akan menjadi brandKey-kode.</p>
          </div>
          <div className="flex items-center gap-2 mt-2 md:col-span-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={(item?.isActive ?? true) !== false} />
              <span className="text-slate-900 text-sm">Aktif</span>
            </label>
          </div>
        </div>
        <VariantsEditor initialVariants={item?.variants || []} fieldName="variants" />
        <div className="pt-2 flex items-center gap-3">
          <button className="bg-indigo-600 text-white px-5 py-2 rounded">Simpan</button>
        </div>
      </form>
      </div>
    </main>
  );
}
