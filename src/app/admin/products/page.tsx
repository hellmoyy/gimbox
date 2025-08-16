import Link from "next/link";
import { getDb } from "../../../lib/mongodb";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  let items: any[] = [];
  try {
    const db = await getDb();
    items = await db.collection("products").find({}).sort({ name: 1 }).toArray();
  } catch (e) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Produk</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/products/[id]" as="/admin/products/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
            <Link href="/admin/products/sync" className="bg-indigo-600 text-white px-3 py-2 rounded">Sync Harga dari Provider</Link>
          </div>
        </div>
        <div className="rounded-xl border p-4 bg-yellow-50 text-yellow-800">
          Tidak bisa terhubung ke database saat ini. Cek koneksi internet/DNS dan nilai MONGODB_URI anda, lalu coba lagi.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Produk</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/[id]" as="/admin/products/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
          <Link href="/admin/products/sync" className="bg-indigo-600 text-white px-3 py-2 rounded">Sync Harga dari Provider</Link>
          <form action="/api/admin/products/seed-local" method="post">
            <button className="bg-slate-700 text-white px-3 py-2 rounded" title="Seed dari data lokal">Seed Lokal</button>
          </form>
        </div>
      </div>
      <div className="rounded-xl border overflow-x-auto w-full">
        <table className="min-w-full w-full table-auto text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
                <th className="p-3">Nama</th>
                <th className="p-3">Kode</th>
                {/* Variants-based pricing; modal & jual removed */}
                <th className="p-3">Kategori</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-t bg-[#fefefe]">
                <td className="p-3">{it.name}</td>
                <td className="p-3">{it.code}</td>
                {/* No direct cost/price when using variants */}
                <td className="p-3">{it.category || 'game'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${it.isActive === false ? 'bg-red-600/10 text-red-700' : 'bg-green-600/10 text-green-700'}`}>{it.isActive === false ? 'Nonaktif' : 'Aktif'}</span>
                  {it.featured ? <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-700">Populer</span> : null}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/products/${it._id}`} className="text-indigo-600 hover:underline">Edit</Link>
                    <form action={`/api/admin/products/${it._id}/duplicate`} method="post">
                      <button type="submit" className="text-slate-600 hover:underline">Duplikat</button>
                    </form>
                    <DeleteButton actionUrl={`/api/admin/products/${it._id}`} confirmText="Hapus produk ini?" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
