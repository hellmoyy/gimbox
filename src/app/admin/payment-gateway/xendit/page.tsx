"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function XenditPage() {
  const [enabled, setEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/gateways/xendit", { cache: "no-store" });
        const data = await res.json();
        const v = data?.data || {};
        setEnabled(Boolean(v.enabled));
        setSecretKey(String(v?.keys?.secretKey || ""));
        setMethods(Array.isArray(v?.methods) ? v.methods : []);
      } catch {}
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/gateways/xendit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, keys: { secretKey }, methods }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Gagal menyimpan");
      setMsg("Tersimpan");
    } catch (e: any) {
      setMsg(e.message);
    } finally { setSaving(false); }
  }

  function toggleMethod(name: string) {
    setMethods((m) => (m.includes(name) ? m.filter((x) => x !== name) : [...m, name]));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Payment Gateway • Xendit</h1>
      <div className="rounded-xl border p-4">
        <div className="font-medium mb-2">Pengaturan</div>
        <div className="flex items-center gap-2 text-sm">
          <input id="en" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <label htmlFor="en">Enable Payment</label>
        </div>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Secret Key</label>
            <input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="XENDIT_SECRET_KEY" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xs text-slate-500 mb-1">Opsi Pembayaran</div>
          <div className="flex flex-wrap gap-3 text-sm">
            {[
              ["OVO","ovo"], ["Dana","dana"], ["LinkAja","linkaja"], ["ShopeePay","shopeepay"], ["QRIS","qris"], ["Virtual Account BCA","va_bca"], ["Virtual Account BNI","va_bni"], ["Virtual Account BRI","va_bri"],
            ].map(([label, key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={methods.includes(String(key))} onChange={() => toggleMethod(String(key))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>
          <div className="text-xs text-slate-600">{msg}</div>
        </div>
        <div className="mt-4 text-sm text-slate-600">Endpoint callback: <code className="bg-slate-100 px-1 rounded">/api/xendit/webhook</code></div>
      </div>
    </div>
  );
}
