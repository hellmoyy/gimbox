"use client";
import { useState } from "react";

type Props = {
  orderId: string;
  provider?: string;
  status?: string;
  sellPrice?: number;
  buyPrice?: number | null;
  fees?: { admin?: number; gateway?: number; other?: number };
};

export default function TransactionEditor({ orderId, provider, status, sellPrice, buyPrice, fees }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    provider: provider || "",
    status: status || "",
    sellPrice: sellPrice ?? 0,
    buyPrice: buyPrice ?? 0,
    adminFee: fees?.admin ?? 0,
    gatewayFee: fees?.gateway ?? 0,
    otherFee: fees?.other ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/transactions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...form, sellPrice: Number(form.sellPrice), buyPrice: Number(form.buyPrice), adminFee: Number(form.adminFee), gatewayFee: Number(form.gatewayFee), otherFee: Number(form.otherFee) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Gagal menyimpan");
      setMsg("Tersimpan");
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  function onNum(name: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value } as any));
  }

  return (
    <div className="rounded-xl border p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Edit Transaksi</div>
        <button type="button" onClick={() => setOpen(!open)} className="text-sm text-indigo-600">{open ? "Tutup" : "Edit"}</button>
      </div>
      {open && (
        <div className="mt-3">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Provider</label>
              <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Harga Jual</label>
              <input type="number" value={form.sellPrice} onChange={onNum("sellPrice")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Harga Beli</label>
              <input type="number" value={form.buyPrice} onChange={onNum("buyPrice")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Biaya Admin</label>
              <input type="number" value={form.adminFee} onChange={onNum("adminFee")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Biaya Gateway</label>
              <input type="number" value={form.gatewayFee} onChange={onNum("gatewayFee")} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Biaya Lainnya</label>
              <input type="number" value={form.otherFee} onChange={onNum("otherFee")} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>
            <div className="text-xs text-slate-600">{msg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
