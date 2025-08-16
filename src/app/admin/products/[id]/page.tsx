import { ObjectId } from "mongodb";
import Link from "next/link";
import { getDb } from "../../../../lib/mongodb";
import ProductImageUploader from "@/components/admin/ProductImageUploader";
import VariantsEditor from "@/components/admin/VariantsEditor";
import { getCategories } from "@/lib/categories";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export default async function ProductEditor({ params }: Params) {
  const { id } = params;
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
  let categories: any[] = [];
  try {
    categories = await getCategories({});
  } catch {}

  return (
  <main className="">
  <div className="w-full">
        <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold text-slate-900">{creating ? "Tambah Produk" : `Edit: ${item?.name || "Produk"}`}</h1>
      <Link href="/admin/products" className="text-sm text-slate-700">← Kembali</Link>
        </div>

  <form action={action} method="post" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-900">Nama</label>
              <input name="name" defaultValue={item?.name || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Kode</label>
              <input name="code" defaultValue={item?.code || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-900">Icon (path relatif di /public, contoh: /images/games/mobile-legends.jpg)</label>
              <input name="icon" defaultValue={item?.icon || ""} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]" />
              <div className="mt-2">
                <ProductImageUploader defaultFolder="products" defaultName={item?.code || "produk"} onUploadedFieldName="icon" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900">Kategori</label>
              <select name="category" defaultValue={item?.category || (categories[0]?.code || "game")} className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-[#fefefe]">
                {categories.length === 0 ? (
                  <>
                    <option value="game">Game</option>
                    <option value="voucher">Voucher</option>
                  </>
                ) : (
                  categories.map((c: any) => (
                    <option key={c._id} value={c.code || c.name}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="featured" defaultChecked={!!item?.featured} />
                <span className="text-slate-900">Populer</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="newRelease" defaultChecked={!!item?.newRelease} />
                <span className="text-slate-900">Baru Rilis</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="voucher" defaultChecked={!!item?.voucher} />
                <span className="text-slate-900">Voucher</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="pulsaTagihan" defaultChecked={!!item?.pulsaTagihan} />
                <span className="text-slate-900">Pulsa & Tagihan</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="entertainment" defaultChecked={!!item?.entertainment} />
                <span className="text-slate-900">Entertainment</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="isActive" defaultChecked={(item?.isActive ?? true) !== false} />
                <span className="text-slate-900">Aktif</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded">Simpan</button>
          </div>
          <VariantsEditor initialVariants={item?.variants || []} fieldName="variants" />
        </form>
      </div>
    </main>
  );
}
