import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function AdminGimcashTransactionsPage() {
  let rows: any[] = [];
  try {
    const db = await getDb();
    rows = await db
      .collection("orders")
      .find(
        {
          $or: [
            { code: "gimcash-topup" },
            { provider: "wallet-topup" },
            { paymentGateway: "wallet" },
          ],
        },
        { projection: { _id: 0 } }
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
  } catch {}

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
    const gw = String(r?.paymentGateway || "").trim();
    return gw ? gw.charAt(0).toUpperCase() + gw.slice(1) : "-";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Transaksi GimCash</h1>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">Waktu</th>
              <th className="py-2 pr-4">Order ID</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Nominal</th>
              <th className="py-2 pr-4">Metode</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-3 text-slate-500">Belum ada transaksi.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.orderId} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.orderId}</td>
                  <td className="py-2 pr-4 truncate max-w-[180px]" title={r.email || r.userId}>{r.email || r.userId}</td>
                  <td className="py-2 pr-4">{money(r.sellPrice || r.nominal)}</td>
                  <td className="py-2 pr-4">{methodFromMidtrans(r)}</td>
                  <td className="py-2 pr-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">{r.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
