"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type DummyTxn = {
  id: string;
  date: string;
  product: string;
  target: string;
  amount: number;
  status: "Sukses" | "Pending" | "Diproses" | "Gagal";
};

const dummyTxns: DummyTxn[] = [];

function formatRupiah(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp${n.toLocaleString("id-ID")}`;
  }
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [active, setActive] = useState<null | "Pending" | "Diproses" | "Sukses" | "Gagal">(null);
  const [selected, setSelected] = useState<null | DummyTxn>(null);
  const [items, setItems] = useState<DummyTxn[]>([]);
  const [hasAny, setHasAny] = useState<boolean>(false);
  const filtered = useMemo(() => {
    if (!active) return items;
    return items.filter((t) => t.status === active);
  }, [active, items]);
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    // Reset or clamp page when filter changes
    setPage(1);
  }, [active]);
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const q = active ? `?status=${encodeURIComponent(active)}` : "";
        const res = await fetch(`/api/transactions/me${q}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && Array.isArray(data.items)) setItems(data.items);
      } catch {}
    }
    if (session) load();
    return () => { ignore = true; };
  }, [session, active]);
  // Determine whether the user has any transactions at all (unfiltered)
  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch(`/api/transactions/me`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setHasAny(Array.isArray(data.items) && data.items.length > 0);
      } catch {}
    }
    if (session) probe();
    return () => { cancelled = true; };
  }, [session]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    if (selected) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = filtered.slice(start, end);
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-4 mt-6">
        {hasAny && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 mb-3">Transaksi</h1>
            {/* Filter buttons */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {[
                { label: "ALL", val: null as null },
                { label: "Menunggu Pembayaran", val: "Pending" as const },
                { label: "Diproses", val: "Diproses" as const },
                { label: "Selesai", val: "Sukses" as const },
                { label: "Dibatalkan", val: "Gagal" as const },
              ].map(({ label, val }) => {
                const isActive = active === val;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => (val === null ? setActive(null) : setActive(isActive ? null : val))}
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition " +
                      (isActive
                        ? "text-white border-transparent shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400")
                    }
                    style={isActive ? { backgroundColor: "#0d6efd" } : undefined}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {!hasAny ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 mx-auto">
                  <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v14l-2-1-2 1-2-1-2 1-2-1-2 1V5A1.5 1.5 0 0 1 7 3.5z"/>
                  <path d="M8 8h8M8 11h8M8 14h5"/>
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-900">Belum ada transaksi</div>
              <div className="mt-1 text-xs text-slate-500">Pesananmu akan tampil di sini.</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] overflow-hidden">
            <table className="w-full text-sm text-slate-800">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-slate-900">
                      <button
                        type="button"
                        title="Lihat detail transaksi"
                        onClick={() => setSelected(t)}
                        className="text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                      >
                        {t.id}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{t.product}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{formatRupiah(t.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          t.status === "Sukses"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-600/10 text-green-700"
                            : t.status === "Pending"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-700"
                            : t.status === "Diproses"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-600/10 text-blue-700"
                            : "inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-600/10 text-red-700"
                        }
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Menampilkan {filtered.length === 0 ? 0 : start + 1}–{Math.min(end, filtered.length)} dari {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={
                    "px-3 py-1.5 rounded border text-sm transition " +
                    (page === 1
                      ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-400")
                  }
                >
                  Sebelumnya
                </button>
                {/* Page numbers */}
                {Array.from({ length: pageCount }).map((_, idx) => {
                  const p = idx + 1;
                  const isActive = p === page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={
                        "min-w-[36px] h-9 px-2 rounded-md border text-sm transition " +
                        (isActive
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:border-slate-400")
                      }
                      style={
                        isActive ? { backgroundColor: "#0d6efd" } : undefined
                      }
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className={
                    "px-3 py-1.5 rounded border text-sm transition " +
                    (page === pageCount
                      ? "bg-white text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white text-slate-700 border-slate-300 hover:border-slate-400")
                  }
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal detail transaksi */}
        {selected && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="txn-title"
                className="w-full max-w-md rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <h2 id="txn-title" className="text-base font-semibold text-slate-900">Detail Transaksi</h2>
                  <button
                    type="button"
                    aria-label="Tutup"
                    onClick={() => setSelected(null)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-4 py-4 text-sm text-slate-800">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                    <div className="col-span-1 text-slate-500">Invoice</div>
                    <div className="col-span-2 font-medium text-slate-900">{selected.id}</div>

                    <div className="col-span-1 text-slate-500">Tanggal</div>
                    <div className="col-span-2">{selected.date}</div>

                    <div className="col-span-1 text-slate-500">Produk</div>
                    <div className="col-span-2">{selected.product}</div>

                    <div className="col-span-1 text-slate-500">Tujuan</div>
                    <div className="col-span-2">{selected.target}</div>

                    <div className="col-span-1 text-slate-500">Jumlah</div>
                    <div className="col-span-2 font-medium text-slate-900">{formatRupiah(selected.amount)}</div>

                    <div className="col-span-1 text-slate-500">Status</div>
                    <div className="col-span-2">
                      <span
                        className={
                          selected.status === "Sukses"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-600/10 text-green-700"
                            : selected.status === "Pending"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-700"
                            : selected.status === "Diproses"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-600/10 text-blue-700"
                            : "inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-600/10 text-red-700"
                        }
                      >
                        {selected.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="w-full rounded-lg text-white py-2 text-sm shadow-sm hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{ backgroundColor: "#0d6efd" }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
