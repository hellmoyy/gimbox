"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";

// Metode pembayaran yang didukung (sesuaikan jika perlu)
const DUITKU_METHODS: Array<[string,string]> = [
  ["QRIS","qris"],
  ["Virtual Account BCA","va_bca"],
  ["Virtual Account BNI","va_bni"],
  ["Virtual Account BRI","va_bri"],
  ["OVO","ovo"],
  ["Dana","dana"],
  ["LinkAja","linkaja"],
  ["ShopeePay","shopeepay"],
];

export default function AdminDuitkuGatewayPage() {
  const [enabled, setEnabled] = useState(false);
  const [merchantCode, setMerchantCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true); // true = sandbox, false = production
  const [methods, setMethods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Load existing config
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/gateways/duitku", { cache: "no-store" });
        const data = await res.json();
        const v = data?.data || {};
        setEnabled(Boolean(v.enabled));
        setMerchantCode(String(v?.keys?.merchantCode || ""));
        setApiKey(String(v?.keys?.apiKey || ""));
        // If backend stores sandbox flag under keys.sandbox / production, normalize
        if (typeof v?.keys?.sandbox === 'boolean') setSandbox(Boolean(v.keys.sandbox));
        else if (typeof v?.keys?.production === 'boolean') setSandbox(!Boolean(v.keys.production));
        setMethods(Array.isArray(v?.methods) ? v.methods : []);
      } catch {}
    })();
  }, []);

  function toggleMethod(name: string) {
    setMethods(m => m.includes(name) ? m.filter(x => x !== name) : [...m, name]);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/gateways/duitku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          keys: { merchantCode, apiKey, sandbox },
          methods,
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Gagal menyimpan");
      setMsg("Tersimpan");
    } catch (e: any) {
      setMsg(e.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Payment Gateway • Duitku</h1>
      <div className="rounded-xl border p-4 max-w-3xl">
        <div className="font-medium mb-2">Pengaturan</div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm min-w-[140px]">
            <input id="en" type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <label htmlFor="en">Enable Payment</label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input id="sb" type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)} />
            <label htmlFor="sb">Sandbox Mode</label>
          </div>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Merchant Code</label>
            <input value={merchantCode} onChange={e => setMerchantCode(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="DUITKU_MERCHANT_CODE" />
          </div>
            <div>
            <label className="block text-xs text-slate-500 mb-1">API Key</label>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="DUITKU_API_KEY" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xs text-slate-500 mb-1">Opsi Pembayaran</div>
          <div className="flex flex-wrap gap-3 text-sm">
            {DUITKU_METHODS.map(([label,key]) => (
              <label key={key} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={methods.includes(key)} onChange={() => toggleMethod(key)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>
          <div className="text-xs text-slate-600">{msg}</div>
        </div>
        <div className="mt-4 text-sm text-slate-600">Callback / Webhook URL (konfigurasikan di dashboard Duitku): <code className="bg-slate-100 px-1 rounded">/api/duitku/notification</code></div>
      </div>
      <div className="mt-8 max-w-3xl">
        <h2 className="font-semibold mb-2">Docs</h2>
        <a href="https://docs.duitku.com/api/id/#langkah-awal" target="_blank" rel="noopener" className="text-indigo-600 hover:underline text-sm">Duitku API Documentation</a>
        <div className="mt-2 text-xs text-slate-500 leading-relaxed">Isi Merchant Code & API Key dari dashboard Duitku. Aktifkan metode pembayaran yang ingin ditampilkan ke user. Sandbox Mode digunakan untuk pengujian; nonaktifkan untuk produksi.</div>
      </div>
    </div>
  );
}
