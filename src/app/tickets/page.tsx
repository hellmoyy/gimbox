"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

function formatDate(s: string) {
  try { return new Date(s).toLocaleString("id-ID"); } catch { return s; }
}

export default function TicketsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/tickets", { cache: "no-store" });
        const j = await res.json();
        if (!ignore && Array.isArray(j?.items)) setItems(j.items);
      } catch {}
    }
    if (session) load();
    return () => { ignore = true; };
  }, [session]);

  async function openTicket() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, orderId: orderId.trim() || undefined }),
      });
      const j = await res.json();
      if (j?.success) {
        setSubject(""); setMessage(""); setOrderId("");
        // reload list
        const rs = await fetch("/api/tickets", { cache: "no-store" });
        const jr = await rs.json();
        if (Array.isArray(jr?.items)) setItems(jr.items);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-4xl px-4 mt-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Tiket Bantuan</h1>
  <div className="bg-white/95 border border-slate-200/60 rounded-xl p-4 mb-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Subjek</label>
              <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="contoh: Order belum masuk" className="mt-1 w-full border border-slate-300/60 rounded px-3 py-2 text-slate-800 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Order ID (opsional)</label>
              <input value={orderId} onChange={(e)=>setOrderId(e.target.value)} placeholder="contoh: INV-12345" className="mt-1 w-full border border-slate-300/60 rounded px-3 py-2 text-slate-800 placeholder-slate-400" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-slate-700">Pesan</label>
              <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={4} className="mt-1 w-full border border-slate-300/60 rounded px-3 py-2 text-slate-800 placeholder-slate-400" placeholder="Jelaskan kendala kamu" />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button onClick={openTicket} disabled={loading || !subject.trim() || !message.trim()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Buka Tiket</button>
            </div>
          </div>
        </div>

    <div className="rounded-xl border border-slate-200/60 bg-white/95 overflow-hidden backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
      <tr className="bg-slate-100/80 text-slate-600">
                <th className="px-2 py-2 text-left">Tiket</th>
                <th className="px-2 py-2 text-left">Subjek</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Update</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-2 py-6 text-center text-slate-500">Belum ada tiket.</td></tr>
              ) : (
        items.map((t) => (
                  <tr key={t.ticketId} className="border-t border-slate-200/60">
          <td className="px-2 py-2 font-mono text-xs"><Link href={`/tickets/${t.ticketId}`} className="text-indigo-600">{t.ticketId}</Link></td>
                    <td className="px-2 py-2">
                      <Link
                        href={`/tickets/${t.ticketId}`}
                        className="text-slate-800 hover:underline block max-w-[120px] truncate"
                        title={t.subject}
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-2 py-2"><span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-semibold uppercase tracking-wide">{t.status}</span></td>
                    <td className="px-2 py-2 text-slate-700">{formatDate(t.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
