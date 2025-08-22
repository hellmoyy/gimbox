"use client";
import { useState } from "react";

export default function AdminDuitkuGatewayPage() {
  const [merchantCode, setMerchantCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    // TODO: Save config to DB or env
    setTimeout(() => {
      setSaving(false);
      setMsg("Tersimpan!");
    }, 800);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Payment Gateway • Duitku</h1>
      <form className="grid gap-4" onSubmit={saveConfig}>
        <label className="block">
          <span className="font-medium">Merchant Code</span>
          <input type="text" className="input" value={merchantCode} onChange={e => setMerchantCode(e.target.value)} required />
        </label>
        <label className="block">
          <span className="font-medium">API Key</span>
          <input type="text" className="input" value={apiKey} onChange={e => setApiKey(e.target.value)} required />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)} />
          <span>Sandbox Mode</span>
        </label>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
        {msg && <div className="text-green-600 font-semibold mt-2">{msg}</div>}
      </form>
      <div className="mt-8">
        <h2 className="font-semibold mb-2">Docs</h2>
        <a href="https://docs.duitku.com/api/id/#langkah-awal" target="_blank" rel="noopener" className="text-blue-600 underline">Duitku API Documentation</a>
      </div>
    </div>
  );
}
