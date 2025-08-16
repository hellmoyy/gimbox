import Link from "next/link";
import { getDb } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  let rows: any[] = [];
  try {
    const db = await getDb();
    rows = await db
      .collection("orders")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
  } catch {}

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Transaksi</h1>
        <a href="/api/admin/transactions/export" className="px-3 py-2 rounded bg-slate-800 text-white text-sm">Export CSV</a>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">Waktu</th>
              <th className="py-2 pr-4">Order ID</th>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Produk</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Harga Jual</th>
              <th className="py-2 pr-4">Harga Beli</th>
              <th className="py-2 pr-4">Fee</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="py-3 text-slate-500">Belum ada transaksi.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.orderId} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.orderId}</td>
                  <td className="py-2 pr-4">{r.provider || "-"}</td>
                  <td className="py-2 pr-4">{r.code}</td>
                  <td className="py-2 pr-4 truncate max-w-[160px]" title={r.email || r.userId}>{r.email || r.userId}</td>
                  <td className="py-2 pr-4">{new Intl.NumberFormat("id-ID").format(r.sellPrice || r.price || 0)}</td>
                  <td className="py-2 pr-4 text-slate-500">{r.buyPrice != null ? new Intl.NumberFormat("id-ID").format(r.buyPrice) : "-"}</td>
                  <td className="py-2 pr-4 text-slate-500">{r.fees?.total != null ? new Intl.NumberFormat("id-ID").format(r.fees.total) : "-"}</td>
                  <td className="py-2 pr-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">{r.status}</span></td>
                  <td className="py-2 pr-4"><Link href={`/admin/transactions/${r.orderId}`} className="text-indigo-600">Detail</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
