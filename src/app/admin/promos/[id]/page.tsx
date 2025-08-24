import { ObjectId } from "mongodb";
import Link from "next/link";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import { getDb } from "../../../../lib/mongodb";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export default async function PromoEditor({ params }: Params) {
  const { id } = params;
  const creating = id === "new";
  const db = await getDb();
  let item: any = null;
  if (!creating) {
    try {
      item = await db.collection("promos").findOne({ _id: new ObjectId(id) });
    } catch {}
  }

  const action = creating ? "/api/admin/promos" : `/api/admin/promos/${id}`;

  return (
    <main>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-900">{creating ? "Tambah Promo" : `Edit: ${item?.title || "Promo"}`}</h1>
          <Link href="/admin/promos" className="text-sm text-slate-700">← Kembali</Link>
        </div>
        <form action={action} method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900">Gambar Promo (path relatif di /public)</label>
            <input name="image" defaultValue={item?.image || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            <div className="mt-2">
              <ProductImageUploader defaultFolder="promos" defaultName={item?.title || "promo"} onUploadedFieldName="image" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Judul</label>
            <input name="title" defaultValue={item?.title || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">Deskripsi</label>
            <textarea name="desc" defaultValue={item?.desc || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900">URL (opsional)</label>
            <input name="url" defaultValue={item?.url || ""} placeholder="https:// atau /path" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            <p className="mt-1 text-xs text-slate-500">Jika diisi, kartu promo akan mengarah ke tautan ini saat diklik.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Tag</label>
              <input name="tag" defaultValue={item?.tag || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Berlaku Sampai</label>
              <input type="date" name="until" defaultValue={item?.until || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            </div>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={(item?.isActive ?? true) !== false} />
            <span className="text-slate-900">Aktif</span>
          </label>
          <div className="pt-2">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded">Simpan</button>
          </div>
        </form>
      </div>
    </main>
  );
}
