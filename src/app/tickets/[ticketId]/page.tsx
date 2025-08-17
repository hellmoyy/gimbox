"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

function formatDate(s: string) {
  try { return new Date(s).toLocaleString("id-ID"); } catch { return s; }
}

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const ticketId = params?.ticketId as string;
  const [ticket, setTicket] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, { cache: "no-store" });
        const j = await res.json();
        if (!ignore && j?.ticket) setTicket(j.ticket);
      } catch {}
    }
    if (ticketId) load();
    return () => { ignore = true; };
  }, [ticketId]);

  async function sendReply() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const j = await res.json();
      if (j?.success) {
        setMessage("");
        // reload
        const rs = await fetch(`/api/tickets/${ticketId}`, { cache: "no-store" });
        const jr = await rs.json();
        if (jr?.ticket) setTicket(jr.ticket);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-3xl px-4 mt-6">
        <div className="mb-4 text-sm"><Link href="/tickets" className="text-indigo-600">← Kembali ke daftar tiket</Link></div>
        {!ticket ? (
          <div className="text-slate-600">Memuat...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-slate-900">{ticket.subject}</h1>
              <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs uppercase">{ticket.status}</span>
            </div>
            <div className="text-sm text-slate-500">Ticket ID: <span className="font-mono">{ticket.ticketId}</span> • Update: {formatDate(ticket.updatedAt)}</div>
            <div className="bg-white border border-slate-200 rounded-xl divide-y">
              {ticket.messages?.map((m: any, idx: number) => (
                <div key={idx} className="p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className={m.author === 'admin' ? 'text-pink-600' : 'text-slate-700'}>
                      {m.author === 'admin' ? 'Admin' : (m.email || 'Kamu')}
                    </span>
                    <span>•</span>
                    <span>{formatDate(m.createdAt)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-slate-800">{m.text}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <label className="block text-sm font-medium text-slate-700">Balas</label>
              <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={3} className="mt-1 w-full border border-slate-300 rounded px-3 py-2" placeholder="Tulis pesan kamu" />
              <div className="mt-2 flex justify-end">
                <button onClick={sendReply} disabled={loading || !message.trim()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Kirim</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
