import { getDb } from "../../../../lib/mongodb";
import TransactionEditor from "../../../../components/admin/TransactionEditor";

export const dynamic = "force-dynamic";

export default async function TransactionDetail({ params }: { params: { orderId: string } }) {
  let row: any = null;
  try {
    const db = await getDb();
    row = await db.collection("orders").findOne({ orderId: params.orderId });
  } catch {}

  if (!row) return <div>Transaksi tidak ditemukan.</div>;

  const money = (n: any) => new Intl.NumberFormat("id-ID").format(Number(n || 0));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Detail Transaksi</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4">
          <div className="font-medium mb-2">Informasi Utama</div>
          <div className="text-sm"><span className="text-slate-500">Order ID:</span> <span className="font-mono">{row.orderId}</span></div>
          <div className="text-sm"><span className="text-slate-500">Waktu:</span> {new Date(row.createdAt).toLocaleString("id-ID")}</div>
          <div className="text-sm"><span className="text-slate-500">Provider:</span> {row.provider || '-'}</div>
          <div className="text-sm"><span className="text-slate-500">Produk:</span> {row.code}</div>
          <div className="text-sm"><span className="text-slate-500">User:</span> {row.email || row.userId}</div>
          <div className="text-sm"><span className="text-slate-500">Status:</span> <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">{row.status}</span></div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="font-medium mb-2">Keuangan</div>
          <div className="text-sm"><span className="text-slate-500">Harga Jual:</span> Rp {money(row.sellPrice || row.price)}</div>
          <div className="text-sm"><span className="text-slate-500">Harga Beli:</span> Rp {row.buyPrice != null ? money(row.buyPrice) : '-'}</div>
          <div className="text-sm"><span className="text-slate-500">Biaya Admin:</span> Rp {money(row.fees?.admin)}</div>
          <div className="text-sm"><span className="text-slate-500">Biaya Gateway:</span> Rp {money(row.fees?.gateway)}</div>
          <div className="text-sm"><span className="text-slate-500">Biaya Lainnya:</span> Rp {money(row.fees?.other)}</div>
          <div className="text-sm font-semibold"><span className="text-slate-500">Total Fee:</span> Rp {money(row.fees?.total)}</div>
          <div className="text-sm font-semibold"><span className="text-slate-500">Laba Kotor:</span> Rp {money((row.sellPrice || row.price || 0) - (row.buyPrice || 0) - (row.fees?.total || 0))}</div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border p-4">
        <div className="font-medium mb-2">Payload Provider</div>
        <pre className="text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-80">{JSON.stringify(row.providerPayload || row, null, 2)}</pre>
      </div>

      <TransactionEditor
        orderId={row.orderId}
        provider={row.provider}
        status={row.status}
        sellPrice={row.sellPrice || row.price}
        buyPrice={row.buyPrice}
        fees={row.fees}
      />
    </div>
  );
}
