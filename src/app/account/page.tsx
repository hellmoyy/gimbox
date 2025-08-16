"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const [gimCash, setGimCash] = useState<number | null>(null);

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
    return () => { ignore = true; };
  }, [session]);
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto w-full max-w-md md:max-w-6xl px-4 mt-6">
        <div className="p-6 text-slate-700 flex flex-col items-center justify-center min-h-[60vh]">
          {loading ? (
            <div>Memuat…</div>
          ) : session ? (
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                <img src={session.user?.image || "/images/logo-gimbox.png"} alt="Avatar" className="mx-auto w-16 h-16 rounded-full object-cover ring-2 ring-white shadow" />
                <div className="mt-3 text-lg font-semibold text-slate-900">{session.user?.name || "Pengguna"}</div>
                <div className="text-xs text-slate-500">{session.user?.email}</div>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">Google</div>

                {/* GimCash */}
                <div className="mt-4 text-left">
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                    <div className="flex items-center gap-3">
                      <img src="/images/gimcash.png" alt="GimCash" className="w-6 h-6 rounded" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">GimCash</div>
                        <div className="text-[11px] text-slate-500">Saldo virtual kamu</div>
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-slate-900">
                      {gimCash === null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(gimCash)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a href="#" className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-60">Top Up (soon)</a>
                      <a href="#" className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold bg-white">Riwayat</a>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <a href="/transactions" className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-slate-700">Transaksi</a>
                  <a href="/promo" className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-slate-700">Promo</a>
                </div>

                <div className="mt-4">
                  <button onClick={() => signOut()} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                    Keluar
                  </button>
                </div>
              </div>

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
