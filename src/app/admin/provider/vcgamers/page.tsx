"use client";
import { useEffect, useMemo, useState } from "react";

export default function AdminVCGamersPage() {
  const [balance, setBalance] = useState<string>("–");
  const [sandbox, setSandbox] = useState<boolean>(false);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [items, setItems] = useState<Array<{ code: string; name: string; cost: number; icon?: string; category?: string }>>([]);
  const [q, setQ] = useState<string>("");
  const [prodCode, setProdCode] = useState("");
  const [custId, setCustId] = useState("");
  const [serverId, setServerId] = useState("");
  const [refId, setRefId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [statusOrderId, setStatusOrderId] = useState("");
  const [statusResult, setStatusResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncEvents, setSyncEvents] = useState<any[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [controller, setController] = useState<AbortController | null>(null);
  const [brandProgress, setBrandProgress] = useState<Record<string,{processed:number;total:number;pct:number}>>({});

  async function startStreamingSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncEvents([]);
    setProgress({ current: 0, total: 0 });
    setBrandProgress({});
    try {
      const ctrl = new AbortController();
      setController(ctrl);
      const res = await fetch(`/api/admin/providers/vcgamers/sync-stream`, { method: 'GET', cache: 'no-store', signal: ctrl.signal });
      if (!res.body) throw new Error('Stream tidak tersedia');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim() !== '');
        for (const line of lines) {
          try {
            const evt = JSON.parse(line);
            setSyncEvents(prev => [...prev.slice(-199), evt]);
            if (evt.type === 'brands') setProgress(p => ({ ...p, total: evt.count }));
            if (evt.type === 'brand:start') setProgress(p => ({ ...p, current: evt.index }));
            if (evt.type === 'brand:progress') {
              setBrandProgress(prev => ({ ...prev, [evt.canonical || evt.key]: { processed: evt.processed, total: evt.totalProducts, pct: evt.pct }}));
            }
          } catch {}
        }
      }
    } catch (e:any) {
      setSyncEvents(prev => [...prev, { type: 'error', message: e.message }]);
    } finally {
      setSyncing(false);
      setController(null);
    }
  }

  function cancelSync() {
    if (controller) {
      controller.abort();
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/provider/vcgamers/config`, { cache: "no-store" });
        const data = await res.json();
        setSandbox(Boolean(data?.sandbox));
      } catch {
        setSandbox(false);
      }
    })();
  }, []);

  async function checkBalance() {
    setBalance("Memeriksa…");
    try {
      const res = await fetch(`/api/admin/provider/vcgamers/balance`, { cache: "no-store" });
      const data = await res.json();
      if (data?.success) setBalance(new Intl.NumberFormat("id-ID").format(data.balance || 0));
      else setBalance(data?.message ? `Gagal: ${data.message}` : "Gagal");
    } catch (e: any) {
      setBalance(`Error: ${e?.message || 'unknown'}`);
    }
  }

  async function loadPriceList() {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/admin/provider/vcgamers/pricelist`, { cache: "no-store" });
      const data = await res.json();
  if (Array.isArray(data?.data)) setItems(data.data);
    } finally {
      setLoadingList(false);
    }
  }

  async function syncToProducts() {
    // Reuse generic sync endpoint
    const form = new FormData();
    form.set("provider", "vcgamers");
    await fetch(`/api/admin/products/sync`, { method: "POST", body: form });
    await loadPriceList();
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [items, q]);

  function exportCsv() {
    const head = ["code", "name", "cost", "category"].join(",");
    const rows = filtered.map((it) => [it.code, it.name.replaceAll(",", " "), String(it.cost), it.category || ""].join(","));
    const csv = [head, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vcgamers-pricelist.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createTestOrder() {
    setSubmitting(true);
    setOrderResult(null);
    try {
      const body: any = { productCode: prodCode.trim(), customerId: custId.trim(), refId: (refId || "").trim() || String(Date.now()) };
      if (serverId.trim()) body.serverId = serverId.trim();
      if (notes.trim()) body.notes = notes.trim();
      const res = await fetch(`/api/provider/vcgamers/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setOrderResult(data);
      if (data?.orderId) setStatusOrderId(String(data.orderId));
    } catch (e: any) {
      setOrderResult({ success: false, message: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function checkOrderStatus() {
    setStatusResult(null);
    if (!statusOrderId.trim()) return;
    try {
      const res = await fetch(`/api/provider/vcgamers/order?orderId=${encodeURIComponent(statusOrderId.trim())}`, { cache: "no-store" });
      const data = await res.json();
      setStatusResult(data);
    } catch (e: any) {
      setStatusResult({ success: false, message: e.message });
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Provider • Vcgamers</h1>
      <div className="text-sm text-slate-600 mb-4">Konfigurasi pada file .env: VCGAMERS_API_KEY, VCGAMERS_SECRET_KEY, VCGAMERS_SANDBOX</div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4">
          <div className="font-medium mb-2">Koneksi</div>
          <div className="text-sm">Mode: <span className="font-semibold">{sandbox ? "Sandbox" : "Production"}</span></div>
          <button onClick={checkBalance} className="mt-3 px-3 py-2 rounded bg-slate-900 text-white text-sm">Cek Saldo</button>
          <div className="mt-2 text-sm text-slate-700">Saldo: <span className="font-semibold">{balance}</span></div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="font-medium mb-2">Catatan</div>
          <ul className="list-disc pl-5 text-sm text-slate-700">
            <li>Pastikan API Key & Secret terisi benar di .env.local</li>
            <li>Set <code>VCGAMERS_SANDBOX=true</code> untuk sandbox</li>
            <li>Atur webhook ke <code>/api/provider/vcgamers/webhook</code></li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Daftar Produk (Price List)</div>
          <div className="flex items-center gap-2">
            <button onClick={loadPriceList} className="px-3 py-2 rounded bg-slate-800 text-white text-sm disabled:opacity-60" disabled={loadingList}>{loadingList ? "Memuat…" : "Muat Price List"}</button>
            <button onClick={syncToProducts} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">Sync ke Produk</button>
            <div className="flex items-center gap-2">
              <button onClick={startStreamingSync} disabled={syncing} className="px-3 py-2 rounded bg-orange-600 text-white text-sm disabled:opacity-60 flex items-center gap-2">
                {syncing && <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {syncing ? 'Full Sync (jalan)…' : 'Full Sync Live'}
              </button>
              {syncing && (
                <button onClick={cancelSync} className="px-3 py-2 rounded bg-red-600 text-white text-sm">Cancel</button>
              )}
            </div>
            <button onClick={exportCsv} className="px-3 py-2 rounded bg-slate-700 text-white text-sm" disabled={filtered.length === 0}>Export CSV</button>
          </div>
        </div>
        { (syncing || syncEvents.length>0) && (
          <div className="mt-3 rounded border bg-slate-50 p-3 text-xs max-h-56 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Progress Sync</div>
              <div>{progress.total>0 ? `${progress.current}/${progress.total} brand` : ''}</div>
            </div>
            {progress.total>0 && (
              <div className="w-full h-2 bg-slate-200 rounded mb-2 overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: progress.total>0? `${(progress.current/progress.total)*100}%`: '0%' }} />
              </div>
            )}
            <ul className="space-y-1">
              {syncEvents.slice(-50).map((e,i) => (
                <li key={i} className="whitespace-pre-wrap">
                  {e.type === 'brand:start' && `▶ ${e.index}. ${e.key}${e.canonical && e.canonical!==e.key ? ' → '+e.canonical:''}`}
                  {e.type === 'brand:progress' && `… ${e.key} ${e.processed}/${e.totalProducts} (${e.pct}%)`}
                  {e.type === 'brand:done' && `✓ ${e.key}${e.canonical && e.canonical!==e.key ? ' → '+e.canonical:''} (${e.products} produk)`}
                  {e.type === 'brands' && `Total brand: ${e.count}`}
                  {e.type === 'done' && `Selesai: ${e.upserted} upserted, aktif ${e.active}, dinonaktifkan ${e.deactivated}`}
                  {e.type === 'error' && `ERROR: ${e.message}`}
                  {e.type === 'start' && 'Mulai sync…'}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari code / nama…" className="w-64 max-w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          <div className="text-xs text-slate-500">Menampilkan {filtered.length} dari {items.length} item</div>
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Kategori</th>
                <th className="py-2 pr-4">Harga</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={3} className="py-3 text-slate-500">Belum ada data. Klik "Muat Price List".</td></tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.code} className="border-t">
                    <td className="py-2 pr-4 font-mono text-xs">{it.code}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        {it.icon ? <img src={it.icon} alt="" className="w-6 h-6 rounded object-cover" /> : null}
                        <span>{it.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{it.category || "-"}</td>
                    <td className="py-2 pr-4">{new Intl.NumberFormat("id-ID").format(it.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <div className="font-medium mb-2">Test Create Order</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Product Code</label>
            <input value={prodCode} onChange={(e) => setProdCode(e.target.value)} placeholder="mis. ML_ID_86" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Customer ID</label>
            <input value={custId} onChange={(e) => setCustId(e.target.value)} placeholder="UserID (atau sesuai produk)" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Server ID (opsional)</label>
            <input value={serverId} onChange={(e) => setServerId(e.target.value)} placeholder="ServerID (jika perlu)" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ref ID</label>
            <div className="flex gap-2">
              <input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="kosongkan untuk gunakan timestamp" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              <button type="button" onClick={() => setRefId(String(Date.now()))} className="px-2 py-2 text-xs rounded bg-slate-100 border">Generate</button>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Catatan (opsional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan" className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3">
          <button onClick={createTestOrder} disabled={!prodCode.trim() || !custId.trim() || submitting} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-60">{submitting ? "Mengirim…" : "Buat Order"}</button>
        </div>
        {orderResult ? (
          <div className="mt-3 text-sm">
            <div className="mb-1">Hasil:</div>
            <pre className="text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-64">{JSON.stringify(orderResult, null, 2)}</pre>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="font-medium mb-2">Cek Status Order</div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={statusOrderId} onChange={(e) => setStatusOrderId(e.target.value)} placeholder="Masukkan Order ID" className="w-64 max-w-full border border-slate-300 rounded px-3 py-2 text-sm" />
            <button onClick={checkOrderStatus} disabled={!statusOrderId.trim()} className="px-3 py-2 rounded bg-slate-800 text-white text-sm disabled:opacity-60">Cek Status</button>
          </div>
          {statusResult ? (
            <pre className="mt-2 text-xs bg-slate-50 border rounded p-2 overflow-auto max-h-64">{JSON.stringify(statusResult, null, 2)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
