import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";
import ProductImageUploader from "../../../../components/admin/ProductImageUploader";
import DeleteButton from "../../../../components/admin/DeleteButton";

export const dynamic = "force-dynamic";

// NOTE: Adjust params typing to standard App Router (object, not Promise) to avoid runtime edge errors in prod
export default async function BannerEditor({ params }: { params: { id: string } }) {
  const { id } = params;
  const isNew = id === "new";
  let banner: any = { image: "", sort: 0, isActive: true, variants: [] };
  if (!isNew) {
    try {
      const db = await getDb();
      const found = await db.collection("banners").findOne({ _id: new ObjectId(id) });
      if (found) banner = found;
    } catch {}
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{isNew ? "Tambah" : "Edit"} Banner</h1>
  <form method="POST" action={`/api/admin/banners/${isNew ? "create" : id}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="isActive" defaultChecked={(banner.isActive ?? true) !== false} /> Aktif
            </label>
            <div>
              <label className="block text-sm font-medium mb-1">Urutan</label>
              <input name="sort" type="number" defaultValue={banner.sort ?? 0} className="w-32 border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL Target (opsional)</label>
            <input name="link" defaultValue={banner.link || ""} placeholder="https://... atau /topup/ml" className="w-full border rounded px-3 py-2" />
          </div>
          {!isNew && (
            <div>
              <DeleteButton actionUrl={`/api/admin/banners/${id}`} confirmText="Hapus banner ini?" />
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Gambar Banner</div>
          <div className="rounded-2xl shadow overflow-hidden min-h-[160px] bg-slate-100 flex items-center justify-center">
            {(() => {
              if (!banner.image) return <div className="text-slate-500 text-sm">Belum ada gambar</div>;
              const vars: string[] = Array.isArray(banner.variants) ? banner.variants : [];
              const lg = vars.find((v)=>/-lg\./.test(v)) || banner.image;
              const md = vars.find((v)=>/-md\./.test(v));
              return (
                <picture>
                  {md && <source media="(max-width:900px)" srcSet={md} />}
                  <source media="(min-width:901px)" srcSet={lg} />
                  <img src={lg} alt="banner" className="w-full h-48 md:h-64 object-cover" />
                </picture>
              );
            })()}
          </div>
          <div className="mt-2 space-y-2">
            <ProductImageUploader defaultFolder="banners" defaultName="banner" onUploadedFieldName="image" variantsFieldName="variants" />
            <div>
              <label className="block text-sm font-medium mb-1">URL Gambar</label>
              <input name="image" defaultValue={banner.image || ""} className="w-full border rounded px-3 py-2 text-sm" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Variants (otomatis diisi saat upload)</label>
              <textarea name="variants" defaultValue={(banner.variants || []).join('\n')} className="w-full border rounded px-3 py-2 text-xs h-20 whitespace-pre" placeholder="" />
              <p className="text-[11px] text-slate-500 mt-1">Setiap baris adalah satu URL variant (misal -lg dan -md). Jangan edit manual kecuali perlu.</p>
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Simpan</button>
        </div>
      </form>
    </div>
  );
}
