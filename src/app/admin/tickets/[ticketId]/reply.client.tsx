"use client";
import { useState } from "react";

export default function ClientBox({ ticketId, currentStatus }: { ticketId: string; currentStatus: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(currentStatus as "open" | "pending" | "closed");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined, status }),
      });
      if (res.ok) {
        location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-slate-700">Balas</label>
          <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={3} className="mt-1 w-full border border-slate-300 rounded px-3 py-2" placeholder="Tulis pesan untuk user (opsional)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="mt-1 w-full border border-slate-300 rounded px-3 py-2">
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Simpan</button>
      </div>
    </div>
  );
}
