import Link from "next/link";
import { getDb } from "../../../lib/mongodb";
import DeleteButton from "@/components/admin/DeleteButton";

type QueryParams = { imported?: string; provider?: string; synced?: string };

export const dynamic = "force-dynamic";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<QueryParams> }) {
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

  const sp = await searchParams;
  const imported = sp?.imported ? Number(sp.imported) : 0;
  const provider = sp?.provider;
  const synced = sp?.synced === '1';
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Produk</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/[id]" as="/admin/products/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
          <Link href="/admin/products/import-new" className="bg-emerald-600 text-white px-3 py-2 rounded">Import Produk Baru</Link>
          <Link href="/admin/products/sync" className="bg-indigo-600 text-white px-3 py-2 rounded">Sync Harga</Link>
          <form action="/api/admin/providers/vcgamers/sync" method="post" className="inline-block" suppressHydrationWarning>
            <input type="hidden" name="deactivateMissing" value="true" />
            <button className="bg-orange-600 text-white px-3 py-2 rounded" formAction="/api/admin/providers/vcgamers/sync">Full Sync VCG</button>
          </form>
        </div>
      </div>
      {imported > 0 && (
        <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 px-4 py-2 text-sm">
          Berhasil import {imported} produk baru{provider ? ` dari ${provider}` : ""}.
        </div>
      )}
      {synced && (
        <div className="mb-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 px-4 py-2 text-sm">
          Sinkronisasi penuh VCG selesai.
        </div>
      )}
      <div className="rounded-xl border overflow-x-auto w-full">
        <table className="min-w-full w-full table-auto text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
                <th className="p-3">Nama</th>
                <th className="p-3">Kode</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Harga (Cost→Price)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-t bg-[#fefefe]">
                <td className="p-3 max-w-[220px]"><div className="truncate" title={it.name}>{it.name}</div></td>
                <td className="p-3 font-mono text-xs">{it.code}</td>
                <td className="p-3 text-xs">{it.provider || '-'}</td>
                <td className="p-3 text-xs">{it.brandKey || '-'}</td>
                <td className="p-3 text-xs">{it.category || 'game'}</td>
                <td className="p-3 text-xs">{typeof it.cost === 'number' ? `${it.cost} → ${it.price ?? '-'}` : '-'}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit px-2 py-0.5 rounded text-xs ${it.isActive === false ? 'bg-red-600/10 text-red-700' : 'bg-green-600/10 text-green-700'}`}>{it.isActive === false ? 'Nonaktif' : 'Aktif'}</span>
                    {it.featured ? <span className="w-fit px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-700">Populer</span> : null}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
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
