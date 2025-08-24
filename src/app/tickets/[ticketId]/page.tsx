"use client";
import { useEffect, useState, useRef } from "react";
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  useEffect(() => {
    let active = true;
    async function buildPreviews() {
      const arr: string[] = [];
      for (const f of files) {
        if (!f.type.startsWith('image/')) { arr.push(''); continue; }
        const dataUrl: string = await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result || ''));
          fr.onerror = () => resolve('');
          fr.readAsDataURL(f);
        });
        arr.push(dataUrl);
      }
      if (active) setPreviews(arr);
    }
    buildPreviews();
    return () => { active = false; };
  }, [files]);

  async function sendReply() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('message', message.trim());
      files.forEach(f => form.append('images', f));
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'POST', body: form });
      const j = await res.json();
      if (j?.success) {
        setMessage("");
        setFiles([]);
        setErrorMsg(null);
        const rs = await fetch(`/api/tickets/${ticketId}`, { cache: "no-store" });
        const jr = await rs.json();
        if (jr?.ticket) setTicket(jr.ticket);
      } else {
        setErrorMsg(j?.error || 'Gagal mengirim pesan');
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
            <div className="bg-white/95 border border-slate-200/60 rounded-xl divide-y divide-slate-200/60 backdrop-blur-sm">
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
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a: any, i: number) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="group relative block">
                          <img src={a.url} alt={a.name || 'attachment'} className="h-20 w-20 object-cover rounded border border-slate-200/60" />
                          <span className="absolute inset-0 rounded bg-black/0 group-hover:bg-black/30 transition" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white/95 border border-slate-200/60 rounded-xl p-3 backdrop-blur-sm">
              <label className="block text-sm font-medium text-slate-700">Balas</label>
              {errorMsg && <p className="mt-1 text-[11px] text-red-600">{errorMsg}</p>}
              <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={3} className="mt-1 w-full border border-slate-300/60 rounded px-3 py-2 text-slate-800 placeholder-slate-400" placeholder="Tulis pesan kamu" />
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e)=>{
                    const list = Array.from(e.target.files || []);
                    const maxFiles = 5;
                    const maxSize = 2 * 1024 * 1024;
                    const filtered = list.filter(f=>f.type.startsWith('image/') && f.size <= maxSize).slice(0, maxFiles);
                    setFiles(filtered);
                  }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={()=>fileInputRef.current?.click()}
                    className="h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 border border-slate-300/60"
                    title="Tambah Gambar"
                    aria-label="Tambah gambar"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </button>
                  <span className="text-[11px] text-slate-500">Maks 5 gambar, tiap 2MB</span>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f,i)=>(
                      <div key={i} className="relative group">
                        {previews[i] ? (
                          <img
                            src={previews[i]}
                            alt={f.name}
                            className="h-16 w-16 object-cover rounded border border-slate-200/60 bg-slate-100"
                            onError={(e)=>{ (e.currentTarget as HTMLImageElement).classList.add('object-contain','p-2'); (e.currentTarget as HTMLImageElement).alt = 'Preview gagal'; }}
                          />
                        ) : (
                          <div className="h-16 w-16 flex items-center justify-center rounded border border-slate-200/60 bg-slate-100 text-[10px] text-slate-500 p-1 text-center animate-pulse">
                            Loading
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={()=>setFiles(prev=>prev.filter((_,x)=>x!==i))}
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full h-6 w-6 flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-red-500/40"
                          aria-label="Hapus gambar"
                          title="Hapus"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={sendReply} disabled={loading || !message.trim()} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{loading ? 'Mengirim…' : 'Kirim'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
