import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
  <Link href="/admin/products" className="p-4 rounded-xl border border-slate-300 bg-[#fefefe] text-slate-900 hover:border-slate-400 hover:shadow">Kelola Produk</Link>
  <Link href="/admin/categories" className="p-4 rounded-xl border border-slate-300 bg-[#fefefe] text-slate-900 hover:border-slate-400 hover:shadow">Kategori</Link>
  <Link href="/admin/settings" className="p-4 rounded-xl border border-slate-300 bg-[#fefefe] text-slate-900 hover:border-slate-400 hover:shadow">Pengaturan</Link>
  <Link href="/admin/transactions" className="p-4 rounded-xl border border-slate-300 bg-[#fefefe] text-slate-900 hover:border-slate-400 hover:shadow">Transaksi</Link>
      </div>
    </div>
  );
}
