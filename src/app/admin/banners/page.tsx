import Link from "next/link";
import { getDb } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

export default async function AdminBanners() {
  let items: any[] = [];
  try {
    const db = await getDb();
    items = await db.collection("banners").find({}).sort({ sort: 1, _id: 1 }).toArray();
  } catch (e) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Banner Hero</h1>
          <Link href="/admin/banners/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
        </div>
        <div className="rounded-xl border p-4 bg-yellow-50 text-yellow-800">DB tidak tersedia.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Banner Hero</h1>
        <div className="flex items-center gap-2">
          <form method="POST" action="/api/admin/banners/seed-defaults">
            <button className="px-3 py-2 rounded border border-slate-300 text-slate-700">Seed Default</button>
          </form>
          <Link href="/admin/banners/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah</Link>
        </div>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
              <th className="p-3">Preview</th>
              <th className="p-3">Urut</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b: any) => (
              <tr key={String(b._id)} className="border-t bg-[#fefefe]">
                <td className="p-3"><img src={b.image || '/images/logo/gimbox.gif'} alt="banner" className="w-40 h-16 object-cover rounded" /></td>
                <td className="p-3">{b.sort ?? ''}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${(b.isActive ?? true) !== false ? 'bg-green-600/10 text-green-700' : 'bg-red-600/10 text-red-700'}`}>{(b.isActive ?? true) !== false ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="p-3"><Link href={`/admin/banners/${b._id}`} className="text-indigo-600 hover:underline">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
