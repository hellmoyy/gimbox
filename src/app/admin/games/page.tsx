import Link from "next/link";
import { getDb } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

export default async function AdminGames() {
  let items: any[] = [];
  try {
    const db = await getDb();
    items = await db.collection("games").find({}).sort({ name: 1 }).toArray();
  } catch (e) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Games</h1>
          <Link href="/admin/games/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
        </div>
        <div className="rounded-xl border p-4 bg-yellow-50 text-yellow-800">
          Tidak bisa terhubung ke database saat ini. Cek koneksi internet/DNS dan nilai MONGODB_URI anda, lalu coba lagi.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Games</h1>
        <Link href="/admin/games/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
              <th className="p-3">Nama</th>
              <th className="p-3">Kode</th>
              <th className="p-3">Icon</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g: any) => (
              <tr key={g._id} className="border-t bg-[#fefefe]">
                <td className="p-3">{g.name}</td>
                <td className="p-3">{g.code}</td>
                <td className="p-3"><img src={g.icon || '/images/logo/gimbox.gif'} alt="icon" className="w-8 h-8 object-cover rounded" /></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${(g.isActive ?? true) !== false ? 'bg-green-600/10 text-green-700' : 'bg-red-600/10 text-red-700'}`}>{(g.isActive ?? true) !== false ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="p-3"><Link href={`/admin/games/${g._id}`} className="text-indigo-600 hover:underline">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
