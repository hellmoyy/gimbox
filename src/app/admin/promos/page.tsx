import Link from "next/link";
import { getDb } from "../../../lib/mongodb";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminPromos() {
  let items: any[] = [];
  try {
    const db = await getDb();
    items = await db.collection("promos").find({}).sort({ createdAt: -1 }).toArray();
  } catch {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Promo</h1>
          <Link href="/admin/promos/[id]" as="/admin/promos/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
        </div>
        <div className="rounded-xl border p-4 bg-yellow-50 text-yellow-800">
          Tidak bisa terhubung ke database saat ini. Periksa MONGODB_URI dan coba lagi.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Promo</h1>
        <Link href="/admin/promos/[id]" as="/admin/promos/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
              <th className="p-3">Judul</th>
              <th className="p-3">Tag</th>
              <th className="p-3">Berlaku Sampai</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it._id} className="border-top bg-[#fefefe]">
                <td className="p-3">{it.title}</td>
                <td className="p-3">{it.tag || "-"}</td>
                <td className="p-3">{it.until || "-"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${it.isActive === false ? 'bg-red-600/10 text-red-700' : 'bg-green-600/10 text-green-700'}`}>{it.isActive === false ? 'Nonaktif' : 'Aktif'}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/promos/${it._id}`} className="text-indigo-600 hover:underline">Edit</Link>
                    <DeleteButton actionUrl={`/api/admin/promos/${it._id}`} confirmText="Hapus promo ini?" />
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
