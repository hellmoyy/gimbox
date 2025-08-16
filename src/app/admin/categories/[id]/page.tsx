import { ObjectId } from "mongodb";
import Link from "next/link";
import { getDb } from "../../../../lib/mongodb";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

export const dynamic = "force-dynamic";

export default async function CategoryEditor({ params }: { params: { id: string } }) {
  const { id } = params;
  const creating = id === "new";
  const db = await getDb();
  let item: any = null;
  if (!creating) {
    try {
      item = await db.collection("categories").findOne({ _id: new ObjectId(id) });
    } catch {}
  }
  const action = creating ? "/api/admin/categories" : `/api/admin/categories/${id}`;

  return (
    <main>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-900">{creating ? "Tambah Kategori" : `Edit: ${item?.name || "Kategori"}`}</h1>
          <Link href="/admin/categories" className="text-sm text-slate-700">← Kembali</Link>
        </div>
        <form action={action} method="post" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Nama</label>
              <input name="name" defaultValue={item?.name || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Kode</label>
              <input name="code" defaultValue={item?.code || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Urutan</label>
              <input name="sort" defaultValue={item?.sort ?? ""} type="number" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900">Icon</label>
              <input name="icon" defaultValue={item?.icon || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
              <div className="mt-2">
                <ProductImageUploader defaultFolder="categories" defaultName={item?.code || item?.name || "kategori"} onUploadedFieldName="icon" />
              </div>
            </div>
            <div>
              <label className="inline-flex items-center gap-2 mt-2">
                <input type="checkbox" name="isActive" defaultChecked={(item?.isActive ?? true) !== false} />
                <span className="text-slate-900">Aktif</span>
              </label>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded">Simpan</button>
            {!creating && (
              <button name="_method" value="DELETE" className="bg-red-600 text-white px-3 py-2 rounded" type="submit">Hapus</button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
