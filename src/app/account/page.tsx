"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-4 mt-6">
  <div className="p-6 text-center text-slate-700 flex flex-col items-center justify-center min-h-[60vh]">
          {loading ? (
            <div>Memuat…</div>
          ) : session ? (
            <div>
              <div className="text-sm mb-2">Masuk sebagai</div>
              <div className="font-semibold">{session.user?.name}</div>
              <div className="text-xs text-slate-500">{session.user?.email}</div>
              <div className="mt-4">
                <button onClick={() => signOut()} className="inline-block bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg">Keluar</button>
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
      </div>
    </main>
  );
}
