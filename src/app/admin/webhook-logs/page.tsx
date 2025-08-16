"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LogItem = {
  _id: string;
  src?: string;
  ts?: string | Date;
  matched?: boolean;
  reason?: string;
  orderId?: string;
  amount?: number;
  expected?: number;
  sellPrice?: number;
  code?: string;
  hookAccount?: string;
  orderAccount?: string;
  body?: any;
};

export default function WebhookLogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [src, setSrc] = useState("moota");
  const [matched, setMatched] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMore = useMemo(() => page * size < total, [page, size, total]);

  async function load(reset = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(reset ? 1 : page), size: String(size) });
      if (src) params.set("src", src);
      if (matched) params.set("matched", matched);
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/webhook-logs?${params.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (j?.success) {
        setItems(j.data.items || []);
        setPage(j.data.page || 1);
        setSize(j.data.size || 20);
        setTotal(j.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Webhook Logs</h1>
          <div className="text-xs text-slate-500">Pantau callback dari Moota/Xendit/Midtrans</div>
        </div>
        <button onClick={() => load(true)} className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50">Refresh</button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Sumber</div>
            <select value={src} onChange={(e) => setSrc(e.target.value)} className="px-2 py-1.5 border rounded-lg">
              <option value="">Semua</option>
              <option value="moota">Moota</option>
              <option value="xendit">Xendit</option>
              <option value="midtrans">Midtrans</option>
              <option value="vcgamers">Vcgamers</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Kecocokan</div>
            <select value={matched} onChange={(e) => setMatched(e.target.value)} className="px-2 py-1.5 border rounded-lg">
              <option value="">Semua</option>
              <option value="true">Matched</option>
              <option value="false">Tidak Match</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs text-slate-500 mb-1">Cari</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order ID / deskripsi" className="w-full px-3 py-1.5 border rounded-lg" />
          </div>
          <div className="ml-auto">
            <button onClick={() => load(true)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Terapkan</button>
          </div>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-3">Waktu</th>
                <th className="py-2 pr-3">Sumber</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Nominal</th>
                <th className="py-2 pr-3">Expected</th>
                <th className="py-2 pr-3">Kode</th>
                <th className="py-2 pr-3">Akun</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">Memuat…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">Tidak ada data</td></tr>
              ) : (
                items.map((it) => {
                  const ts = it.ts ? new Date(it.ts as any) : null;
                  const statusCls = it.matched ? "bg-green-600/10 text-green-700" : "bg-yellow-500/10 text-yellow-700";
                  const money = (n: any) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));
                  return (
                    <tr key={String((it as any)._id || Math.random())} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{ts ? ts.toLocaleString("id-ID") : "-"}</td>
                      <td className="py-2 pr-3 capitalize">{it.src || '-'}</td>
                      <td className="py-2 pr-3">
                        {it.orderId ? (
                          <Link href={`/admin/transactions/${it.orderId}`} className="text-indigo-600">{it.orderId}</Link>
                        ) : '-'}
                      </td>
                      <td className="py-2 pr-3">{money(it.amount)}</td>
                      <td className="py-2 pr-3">{money(it.expected)}</td>
                      <td className="py-2 pr-3">{it.code || '-'}</td>
                      <td className="py-2 pr-3">
                        {it.hookAccount || it.orderAccount ? (
                          <div className="text-xs">
                            <div className="text-slate-600">Hook: {it.hookAccount || '-'}</div>
                            <div className="text-slate-600">Order: {it.orderAccount || '-'}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-2 pr-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${statusCls}`}>{it.matched ? 'Matched' : (it.reason ? it.reason : 'Pending')}</span></td>
                      <td className="py-2 pr-3">
                        <details>
                          <summary className="text-indigo-600 cursor-pointer select-none">Lihat payload</summary>
                          <pre className="mt-2 bg-slate-50 p-2 rounded border max-h-60 overflow-auto text-xs">{JSON.stringify(it.body, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-slate-600">Total: {total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={() => { setPage((p)=>p-1); setTimeout(()=>load(false), 0); }} className="px-3 py-1.5 border rounded disabled:opacity-50">Prev</button>
            <div>Hal {page}</div>
            <button disabled={!hasMore} onClick={() => { setPage((p)=>p+1); setTimeout(()=>load(false), 0); }} className="px-3 py-1.5 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
