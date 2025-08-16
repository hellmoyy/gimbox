"use client";
import { useEffect, useMemo, useState } from "react";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Array<{ email: string; name?: string; balance: number; updatedAt?: string }>>([]);
  const [total, setTotal] = useState(0);

  // Modal state for user history
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmail, setHistoryEmail] = useState("");
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; date: string; title: string; amount: number; status: string }>>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const historyTotalPages = useMemo(() => Math.max(1, Math.ceil(historyTotal / historyPageSize)), [historyTotal, historyPageSize]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || "Gagal memuat data");
      setItems(j.data || []);
      setTotal(j.total || 0);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  async function openHistory(email: string) {
    try {
      setHistoryOpen(true);
      setHistoryEmail(email);
      setHistoryPage(1);
      setHistoryLoading(true);
      setHistoryError("");
      const params = new URLSearchParams({ email, page: "1", pageSize: String(historyPageSize) });
      const res = await fetch(`/api/admin/users/history?${params.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || "Gagal memuat riwayat");
      setHistoryItems(j.data || []);
      setHistoryTotal(j.total || 0);
    } catch (e: any) {
      setHistoryError(e?.message || "Terjadi kesalahan");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchHistoryPage(p: number) {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const params = new URLSearchParams({ email: historyEmail, page: String(p), pageSize: String(historyPageSize) });
      const res = await fetch(`/api/admin/users/history?${params.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || "Gagal memuat riwayat");
      setHistoryItems(j.data || []);
      setHistoryTotal(j.total || 0);
      setHistoryPage(p);
    } catch (e: any) {
      setHistoryError(e?.message || "Terjadi kesalahan");
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Kelola Users</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau email..."
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
          <button onClick={() => { setPage(1); fetchUsers(); }} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Cari</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Balance</th>
              <th className="py-2 pr-4">Detail</th>
              <th className="py-2 pr-4">Diperbarui</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center">Memuat…</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="py-6 text-center text-red-600">{error}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-slate-500">Tidak ada data</td></tr>
            ) : (
              items.map((u) => (
                <tr key={u.email} className="border-b">
                  <td className="py-2 pr-4 font-medium">{u.email}</td>
                  <td className="py-2 pr-4">{u.name || '-'}</td>
                  <td className="py-2 pr-4">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(u.balance)}</td>
                  <td className="py-2 pr-4">
                    <button onClick={() => openHistory(u.email)} className="px-2 py-1 rounded border text-xs hover:bg-slate-50">Detail</button>
                  </td>
                  <td className="py-2 pr-4">{u.updatedAt ? new Date(u.updatedAt).toLocaleString('id-ID') : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
          <span>Hal {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
          <div className="relative z-10 mx-auto mt-24 w-full max-w-2xl px-4">
            <div className="rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <div className="text-sm font-semibold">Riwayat GimCash</div>
                  <div className="text-xs text-slate-500">{historyEmail}</div>
                </div>
                <button onClick={() => setHistoryOpen(false)} className="p-1 rounded hover:bg-slate-100" aria-label="Tutup">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                {historyLoading ? (
                  <div className="p-6 text-center text-sm">Memuat…</div>
                ) : historyError ? (
                  <div className="p-6 text-center text-sm text-red-600">{historyError}</div>
                ) : historyItems.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">Tidak ada riwayat</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-4">Tanggal</th>
                        <th className="py-2 pr-4">Judul</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map((it) => (
                        <tr key={it.id} className="border-b">
                          <td className="py-2 pr-4 whitespace-nowrap">{new Date(it.date).toLocaleString('id-ID')}</td>
                          <td className="py-2 pr-4">{it.title}</td>
                          <td className="py-2 pr-4">{it.status}</td>
                          <td className="py-2 pr-4 text-right">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border-t text-sm">
                <div>Total: {historyTotal}</div>
                <div className="flex items-center gap-2">
                  <button disabled={historyPage <= 1 || historyLoading} onClick={() => fetchHistoryPage(Math.max(1, historyPage - 1))} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                  <span>Hal {historyPage} / {historyTotalPages}</span>
                  <button disabled={historyPage >= historyTotalPages || historyLoading} onClick={() => fetchHistoryPage(Math.min(historyTotalPages, historyPage + 1))} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

