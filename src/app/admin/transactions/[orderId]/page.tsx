import { getDb } from "../../../../lib/mongodb";
import TransactionEditor from "../../../../components/admin/TransactionEditor";

export const dynamic = "force-dynamic";

export default async function TransactionDetail({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let row: any = null;
  try {
    const db = await getDb();
    row = await db.collection("orders").findOne({ orderId });
  } catch {}

  if (!row) return <div>Transaksi tidak ditemukan.</div>;

  const money = (n: any) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));
  const methodFromMidtrans = (r: any): string => {
    const pt = r?.midtransNotification?.payment_type;
    if (pt) {
      const v = String(pt).toLowerCase();
      if (v === "qris") return "QRIS";
      if (v === "gopay") return "GoPay";
      if (v === "shopeepay") return "ShopeePay";
      if (v === "credit_card") return "Kartu Kredit";
      if (v === "cstore") return String(r?.midtransNotification?.store || "Gerai").toUpperCase();
      if (v === "bank_transfer") {
        const va = Array.isArray(r?.midtransNotification?.va_numbers) ? r.midtransNotification.va_numbers[0] : null;
        const bank = String(va?.bank || r?.midtransNotification?.bank || "").toUpperCase();
        return bank ? `${bank} Virtual Account` : "Bank Transfer";
      }
      if (v === "echannel") return "Mandiri Bill";
      if (v === "permata") return "Permata Virtual Account";
      return v.charAt(0).toUpperCase() + v.slice(1);
    }
    const gw = String(row?.paymentGateway || "").trim();
    return gw ? gw.charAt(0).toUpperCase() + gw.slice(1) : "-";
  };
  const methodName = methodFromMidtrans(row);

  const statusLabel = String(row.status || "").toLowerCase();
  const statusClass =
    statusLabel === "paid" || statusLabel === "settlement" || statusLabel === "capture"
      ? "bg-green-600/10 text-green-700"
      : statusLabel === "pending"
      ? "bg-yellow-500/10 text-yellow-700"
      : ["failed", "deny", "denied", "cancel", "expire", "failure", "error"].includes(statusLabel)
      ? "bg-red-600/10 text-red-700"
      : "bg-blue-600/10 text-blue-700";

  const createdAt = row.createdAt ? new Date(row.createdAt) : null;
  const updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Detail Transaksi</h1>
          <div className="mt-1 text-sm text-slate-600 flex items-center gap-2">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-mono text-slate-900">{row.orderId}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${statusClass}`}>{row.status}</span>
          </div>
          {createdAt && (
            <div className="text-xs text-slate-500 mt-1">Dibuat: {createdAt.toLocaleString("id-ID")}{updatedAt ? ` • Diperbarui: ${updatedAt.toLocaleString("id-ID")}` : ""}</div>
          )}
        </div>
        <a href="/admin/transactions" className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Kembali</a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Ringkasan */}
        <div className="rounded-xl border bg-white p-4">
          <div className="font-medium mb-3">Ringkasan</div>
          <div className="text-sm grid grid-cols-3 gap-x-3 gap-y-2">
            <div className="text-slate-500">Produk</div>
            <div className="col-span-2">{row.code}</div>
            <div className="text-slate-500">Provider</div>
            <div className="col-span-2">{row.provider || '-'}</div>
            <div className="text-slate-500">User</div>
            <div className="col-span-2 truncate" title={row.email || row.userId}>{row.email || row.userId}</div>
            <div className="text-slate-500">Gateway</div>
            <div className="col-span-2">{row.paymentGateway || '-'}</div>
            <div className="text-slate-500">Metode</div>
            <div className="col-span-2">{methodName}</div>
          </div>
          <div className="mt-3 text-sm grid grid-cols-3 gap-x-3 gap-y-2">
            <div className="text-slate-500">Waktu</div>
            <div className="col-span-2">{createdAt ? createdAt.toLocaleString('id-ID') : '-'}</div>
            <div className="text-slate-500">Update</div>
            <div className="col-span-2">{updatedAt ? updatedAt.toLocaleString('id-ID') : '-'}</div>
          </div>
        </div>

        {/* Keuangan */}
        <div className="rounded-xl border bg-white p-4">
          <div className="font-medium mb-3">Keuangan</div>
          <div className="text-sm grid grid-cols-3 gap-x-3 gap-y-2">
            <div className="text-slate-500">Harga Jual</div>
            <div className="col-span-2 font-medium">{money(row.sellPrice || row.price)}</div>
            <div className="text-slate-500">Harga Beli</div>
            <div className="col-span-2">{row.buyPrice != null ? money(row.buyPrice) : '-'}</div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-500 mb-1">Rincian Biaya</div>
            <div className="rounded-lg border text-sm overflow-hidden">
              <div className="grid grid-cols-2 px-3 py-2 border-b"><div className="text-slate-600">Admin</div><div className="text-right">{money(row.fees?.admin)}</div></div>
              <div className="grid grid-cols-2 px-3 py-2 border-b"><div className="text-slate-600">Gateway</div><div className="text-right">{money(row.fees?.gateway)}</div></div>
              <div className="grid grid-cols-2 px-3 py-2 border-b"><div className="text-slate-600">Lainnya</div><div className="text-right">{money(row.fees?.other)}</div></div>
              <div className="grid grid-cols-2 px-3 py-2 bg-slate-50"><div className="font-medium">Total Fee</div><div className="text-right font-semibold">{money(row.fees?.total)}</div></div>
            </div>
            <div className="mt-2 text-sm font-semibold">
              <span className="text-slate-600">Laba Kotor:</span> {money((row.sellPrice || row.price || 0) - (row.buyPrice || 0) - (row.fees?.total || 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Midtrans info if available */}
      {row?.midtransNotification && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <div className="font-medium mb-2">Midtrans</div>
          <div className="text-sm grid md:grid-cols-2 gap-3">
            <div className="grid grid-cols-3 gap-x-3 gap-y-2">
              <div className="text-slate-500">Status</div>
              <div className="col-span-2">{row.midtransNotification.transaction_status || '-'}</div>
              <div className="text-slate-500">Tipe</div>
              <div className="col-span-2">{row.midtransNotification.payment_type || '-'}</div>
              {row.midtransNotification.bank ? (<>
                <div className="text-slate-500">Bank</div>
                <div className="col-span-2">{row.midtransNotification.bank}</div>
              </>) : null}
              {Array.isArray(row.midtransNotification.va_numbers) && row.midtransNotification.va_numbers.length ? (
                <>
                  <div className="text-slate-500">Virtual Account</div>
                  <div className="col-span-2">{row.midtransNotification.va_numbers[0]?.va_number}</div>
                </>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-2">
              <div className="text-slate-500">Metode</div>
              <div className="col-span-2">{methodName}</div>
              {row.snapRedirectUrl ? (
                <>
                  <div className="text-slate-500">Pembayaran</div>
                  <div className="col-span-2 truncate"><a href={row.snapRedirectUrl} target="_blank" className="text-indigo-600">Buka link</a></div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Provider payload (collapsible) */}
      <div className="mt-4 rounded-xl border bg-white p-4">
        <details>
          <summary className="cursor-pointer select-none text-sm font-medium">Payload Provider</summary>
          <pre className="mt-3 text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-80">{JSON.stringify(row.providerPayload || row, null, 2)}</pre>
        </details>
      </div>

      {/* Editor */}
      <div className="mt-4">
        <TransactionEditor
          orderId={row.orderId}
          provider={row.provider}
          status={row.status}
          sellPrice={row.sellPrice || row.price}
          buyPrice={row.buyPrice}
          fees={row.fees}
        />
      </div>
    </div>
  );
}
