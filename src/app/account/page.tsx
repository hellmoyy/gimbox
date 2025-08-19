"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const [gimCash, setGimCash] = useState<number | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string>("");

  useEffect(() => {
    let ignore = false;
    async function loadWallet() {
      try {
        const res = await fetch("/api/wallet/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) setGimCash(typeof data.balance === "number" ? data.balance : 0);
      } catch {}
    }
    if (session) loadWallet();
    return () => {
      ignore = true;
    };
  }, [session]);

  // Profile display values
  const profileName = (session?.user?.name || "").trim();
  const profileEmail = (session?.user?.email || "").trim();
  const profileImage = session?.user?.image as string | undefined;
  const profileInitials = (profileName || profileEmail || "U")
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Load Midtrans Snap script using client key (detect sandbox by key prefix 'SB-')
  async function ensureMidtransSnap(clientKey: string) {
    if (!clientKey) throw new Error("Midtrans client key kosong");
    if (typeof window !== "undefined" && (window as any).snap) return;
    const scriptId = "midtrans-snap-script";
    if (document.getElementById(scriptId)) return;
    const isSandbox = clientKey.startsWith("SB-");
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = isSandbox ? "https://app.sandbox.midtrans.com/snap/snap.js" : "https://app.midtrans.com/snap/snap.js";
      s.setAttribute("data-client-key", clientKey);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
      document.body.appendChild(s);
    });
  }

  // Dummy GimCash history (15 items)
  type HistoryItem = { id: number; date: string; title: string; note: string; amount: number };
  const historyData: HistoryItem[] = Array.from({ length: 15 }, (_, i) => {
    const idx = i + 1;
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const iso = dt.toISOString();
    const topup = idx % 3 === 0; // some positive entries
    return {
      id: idx,
      date: iso,
      title: topup ? "Top Up GimCash" : "Pembelian Produk",
      note: topup ? `Top up via Midtrans #${1000 + idx}` : `Order #${5000 + idx}`,
      amount: topup ? 20000 + idx * 1000 : -(15000 + idx * 500),
    };
  });
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(historyData.length / pageSize));
  const pagedHistory = historyData.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const fmtIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto w-full max-w-md md:max-w-6xl px-4 mt-6">
        <div className="p-6 text-slate-700 flex flex-col items-center justify-center min-h-[60vh]">
          {loading ? (
            <div>Memuat…</div>
          ) : session ? (
            <div className="w-full max-w-sm">
              {/* Profile header (no card) */}
              <div className="mb-4 text-center">
                <div className="flex flex-col items-center">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={profileName || profileEmail || "User"}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200 mb-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-semibold mb-2">
                      {profileInitials}
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-800">{profileName || profileEmail || "User"}</p>
                  {profileEmail ? <p className="text-xs text-slate-500 mt-0.5">{profileEmail}</p> : null}
                </div>
              </div>
              {/* GimCash Card - separated */}
              <div className="mb-4 text-left">
                <section className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <div className="bg-blue-600 text-white p-5">
                    <div className="flex items-center gap-4">
                      {/* GimCash icon */}
                      <img
                        src="/images/logo/gimbox.gif"
                        alt="GimCash"
                        className="h-11 w-11 rounded-full object-contain bg-transparent"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs">GimCash Balance</p>
                        <p className="text-2xl font-semibold truncate">
                          {gimCash === null
                            ? "—"
                            : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(gimCash)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 ring-1 ring-white/30">Point: {new Intl.NumberFormat('id-ID').format(points)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <button onClick={() => setTopupOpen(true)} className="col-span-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2.5 hover:bg-blue-700">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M12 19V5M12 5l-5 5M12 5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Top Up
                      </button>
                      <button onClick={() => { setHistoryOpen(true); setHistoryPage(1); }} className="col-span-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 hover:bg-slate-50 bg-white text-slate-800">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Riwayat
                      </button>
                    </div>
                    {/* helper text removed as requested */
                    }
                  </div>
                </section>
              </div>


              {/* Profile Card removed as requested */}

              {/* Menus */}
              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-2 mb-2">Social</div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Join Discord</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                  <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">Join Telegram</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-2 mb-2">Support</div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <a href="/support/customer-service" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Customer Service</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                  <a href="/support/ticket" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">Open Ticket</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                </div>
              </div>

              <div className="mt-6 mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-2 mb-2">Others</div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <a href="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 border-b border-slate-100">
                    <span className="text-sm text-slate-700">Privacy Policy</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                  <a href="/terms" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <span className="text-sm text-slate-700">Term & Condition</span>
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  </a>
                </div>
              </div>

              {/* Logout at the very bottom */}
              <div className="mt-6">
                <button onClick={() => signOut()} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
                  Keluar
                </button>
              </div>

              {/* Top Up GimCash modal */}
              {topupOpen && (
                <div className="fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setTopupOpen(false)} />
                  <div className="relative z-10 mx-auto mt-24 w-full max-w-md px-4">
                    <div className="rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800">Top Up GimCash</h3>
                        <button onClick={() => setTopupOpen(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500" aria-label="Tutup">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-2">Pilih nominal cepat</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[20000, 50000, 100000, 500000].map((v) => (
                              <button
                                key={v}
                                onClick={() => setTopupAmount(v)}
                                className={`px-2 py-2 rounded-lg text-sm font-medium ${topupAmount === v ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                              >
                                {fmtIDR(v)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label htmlFor="topup-amount" className="block text-xs font-medium text-slate-600 mb-1">Nominal lain</label>
                          <div className="flex items-center gap-2">
                            <input
                              id="topup-amount"
                              type="number"
                              inputMode="numeric"
                              min={1000}
                              step={1000}
                              value={topupAmount}
                              onChange={(e) => setTopupAmount(Math.max(0, Number(e.target.value || 0)))}
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                            <span className="text-sm text-slate-600 whitespace-nowrap">IDR</span>
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex items-center justify-between">
                          <span className="text-slate-600">Total Top Up</span>
                          <span className="font-semibold text-slate-900">{fmtIDR(topupAmount)}</span>
                        </div>
                        {topupError ? <p className="text-[12px] text-red-600">{topupError}</p> : <p className="text-[11px] text-slate-500">Anda akan diarahkan ke halaman pembayaran Midtrans.</p>}
                      </div>
                      <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-200 text-sm">
                        <button className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => { if (!topupLoading) setTopupOpen(false); }} disabled={topupLoading}>
                          Batal
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                          disabled={topupAmount < 20000 || topupLoading}
                          onClick={async () => {
                            try {
                              setTopupLoading(true);
                              setTopupError("");
                              const email = (session as any)?.user?.email || "";
                              if (!email) {
                                setTopupError("Silakan masuk terlebih dahulu.");
                                setTopupLoading(false);
                                return;
                              }
                              const res = await fetch('/api/order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  code: 'gimcash-topup',
                                  userId: email,
                                  email,
                                  nominal: topupAmount,
                                  price: topupAmount,
                                  gateway: 'midtrans',
                                  provider: 'wallet-topup',
                                }),
                              });
                              const j = await res.json();
                              if (!res.ok || !j?.success) {
                                throw new Error(j?.message || 'Gagal membuat transaksi');
                              }
                              const token = j?.snapToken || '';
                              const clientKey = j?.midtransClientKey || '';
                              if (clientKey && token) {
                                await ensureMidtransSnap(clientKey);
                                const snap = (window as any).snap;
                                if (snap && typeof snap.pay === 'function') {
                                  snap.pay(token, {
                                    onSuccess: () => {
                                      setTopupOpen(false);
                                    },
                                    onPending: () => {
                                      setTopupOpen(false);
                                    },
                                    onError: (err: any) => {
                                      setTopupError(err?.message || 'Pembayaran gagal. Coba lagi.');
                                    },
                                    onClose: () => {
                                      setTopupError('Anda menutup popup sebelum menyelesaikan pembayaran.');
                                    },
                                  });
                                  return;
                                }
                              }
                              // Fallback to redirect when snap popup not available
                              const redirectUrl = j?.snapRedirectUrl || '';
                              if (redirectUrl) {
                                window.location.href = redirectUrl;
                                return;
                              }
                              setTopupError('Tidak dapat membuka pembayaran. Coba lagi.');
                            } catch (e: any) {
                              setTopupError(e?.message || 'Terjadi kesalahan. Coba lagi.');
                            } finally {
                              setTopupLoading(false);
                            }
                          }}
                        >
                          {topupLoading ? 'Memproses…' : 'Lanjutkan'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GimCash history modal */}
              {historyOpen && (
                <div className="fixed inset-0 z-50">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setHistoryOpen(false)} />
                  <div className="relative z-10 mx-auto mt-24 w-full max-w-md px-4">
                    <div className="rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800">Riwayat GimCash</h3>
                        <button onClick={() => setHistoryOpen(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500" aria-label="Tutup">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                      <div className="max-h-[60vh] overflow-auto p-2">
                        <ul className="divide-y divide-slate-200">
                          {pagedHistory.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 p-3">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${item.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {item.amount > 0 ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-5 5M12 5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                                  <p className={`text-sm font-semibold whitespace-nowrap ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtIDR(item.amount)}</p>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{item.note}</p>
                                <p className="text-[11px] text-slate-400">{new Date(item.date).toLocaleString('id-ID')}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-3 border-t border-slate-200 text-sm">
                        <button
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage <= 1}
                        >
                          Prev
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              className={`h-8 w-8 rounded-md text-sm font-medium ${p === historyPage ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                              onClick={() => setHistoryPage(p)}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <button
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                          onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                          disabled={historyPage >= totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-3">Anda belum masuk.</div>
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="mx-auto flex items-center gap-2 bg-[#fefefe] text-slate-800 text-sm font-semibold px-4 py-2 rounded-full border border-slate-300 shadow hover:shadow-md hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.949 3.051l5.657-5.657C34.201 6.053 29.326 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.652-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.156 7.949 3.051l5.657-5.657C34.201 6.053 29.326 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.214 35.091 26.737 36 24 36c-5.202 0-9.62-3.317-11.281-7.954l-6.49 5.003C9.539 39.563 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.793 2.239-2.231 4.166-3.994 5.565l.003-.002 6.191 5.238C39.17 35.688 44 30 44 24c0-1.341-.138-2.652-.389-3.917z"/>
                </svg>
                <span>Masuk dengan Google</span>
              </button>
            </div>
          )}
        </div>
        <div className="mt-6 mb-10 text-center text-[11px] leading-5 text-slate-500">
          <div>PT Gimbox Digital Indonesia</div>
          <div>© 2025 GIMBOX.ID . All rights reserved.</div>
        </div>
      </div>
    </main>
  );
}
