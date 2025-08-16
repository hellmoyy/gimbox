"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type ProvName = "vcgamers" | "digiflazz" | "iak";
type ProvState = { enabled: boolean; loading?: boolean; saving?: boolean; error?: string; savedMsg?: string; balance?: number | null; balLoading?: boolean };

const def: ProvState = { enabled: false, loading: true };

export default function ProviderOverviewPage() {
  const [vcg, setVcg] = useState<ProvState>(def);
  const [digi, setDigi] = useState<ProvState>(def);
  const [iak, setIak] = useState<ProvState>(def);

  useEffect(() => {
    (async () => {
      await Promise.all([
        loadProv("vcgamers", setVcg),
        loadProv("digiflazz", setDigi),
        loadProv("iak", setIak),
      ]);
      // Load balances in parallel after status load
      await Promise.all([
        loadBalance("vcgamers", setVcg),
        loadBalance("digiflazz", setDigi),
        loadBalance("iak", setIak),
      ]);
    })();
  }, []);

  async function loadProv(name: ProvName, setter: Dispatch<SetStateAction<ProvState>>) {
    setter((s) => ({ ...s, loading: true, error: undefined, savedMsg: undefined }));
    try {
      const res = await fetch(`/api/admin/providers/${name}`, { cache: "no-store" });
      const json = await res.json();
      const v = json?.data || {};
      setter({ enabled: Boolean(v.enabled), loading: false });
    } catch (e: any) {
      setter({ enabled: false, loading: false, error: e?.message || "Gagal memuat" });
    }
  }

  async function toggle(name: ProvName, current: ProvState, setter: Dispatch<SetStateAction<ProvState>>) {
    const nextEnabled = !current.enabled;
    setter({ ...current, enabled: nextEnabled, saving: true, error: undefined, savedMsg: undefined });
    try {
      const res = await fetch(`/api/admin/providers/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Gagal menyimpan");
      setter({ ...current, enabled: nextEnabled, saving: false, savedMsg: "Tersimpan" });
    } catch (e: any) {
      setter({ ...current, enabled: !nextEnabled, saving: false, error: e?.message || "Gagal menyimpan" });
    }
  }

  async function loadBalance(name: ProvName, setter: Dispatch<SetStateAction<ProvState>>) {
    setter((s) => ({ ...s, balLoading: true }));
    try {
      const res = await fetch(`/api/admin/provider/${name}/balance`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const success = Boolean(json?.success);
      const balance = typeof json?.balance === "number" ? json.balance : null;
      setter((s) => ({ ...s, balLoading: false, balance: success ? balance : null }));
    } catch {
      setter((s) => ({ ...s, balLoading: false, balance: null }));
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Provider • Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <ProvCard name="Vcgamers" href="/admin/provider/vcgamers" state={vcg} onToggle={() => toggle("vcgamers", vcg, setVcg)} />
        <ProvCard name="Digiflazz" href="/admin/provider/digiflazz" state={digi} onToggle={() => toggle("digiflazz", digi, setDigi)} />
        <ProvCard name="IAK" href="/admin/provider/iak" state={iak} onToggle={() => toggle("iak", iak, setIak)} />
      </div>
    </div>
  );
}

function ProvCard({ name, href, state, onToggle }: { name: string; href: string; state: ProvState; onToggle: () => void }) {
  const badgeCls = state.enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-medium">{name}</div>
          <div className="text-xs text-slate-500">Status: <span className={`px-2 py-0.5 rounded ${badgeCls}`}>{state.enabled ? "Enabled" : "Disabled"}</span></div>
        </div>
        <button onClick={onToggle} disabled={state.loading || state.saving} className="px-3 py-1.5 rounded text-sm bg-indigo-600 text-white disabled:opacity-60">
          {state.saving ? "Menyimpan…" : state.enabled ? "Matikan" : "Aktifkan"}
        </button>
      </div>
      <div className="mt-2 text-sm text-slate-600">
        Saldo: {state.balLoading ? "Memuat…" : (typeof state.balance === "number" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(state.balance) : "–")}
      </div>
      {state.error && <div className="mt-2 text-xs text-rose-600">{state.error}</div>}
      {state.savedMsg && <div className="mt-2 text-xs text-emerald-700">{state.savedMsg}</div>}
      <div className="mt-4"><Link href={href} className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Kelola</Link></div>
    </div>
  );
}
