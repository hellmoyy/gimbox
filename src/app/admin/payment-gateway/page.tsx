"use client";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type GwName = "midtrans" | "xendit" | "moota";
type GwState = {
  enabled: boolean;
  keys: Record<string, any>;
  methods: string[];
  loading?: boolean;
  saving?: boolean;
  error?: string;
  savedMsg?: string;
};

const defaultState: GwState = { enabled: false, keys: {}, methods: [], loading: true };

export default function PaymentGatewayOverviewPage() {
  const [midtrans, setMidtrans] = useState<GwState>(defaultState);
  const [xendit, setXendit] = useState<GwState>(defaultState);
  const [moota, setMoota] = useState<GwState>(defaultState);

  useEffect(() => {
    // Load all gateway configs in parallel
    (async () => {
      await Promise.all([
        loadGw("midtrans", setMidtrans),
        loadGw("xendit", setXendit),
        loadGw("moota", setMoota),
      ]);
    })();
  }, []);

  async function loadGw(name: GwName, setter: Dispatch<SetStateAction<GwState>>) {
    setter((s) => ({ ...s, loading: true, error: undefined, savedMsg: undefined }));
    try {
      const res = await fetch(`/api/admin/gateways/${name}`, { cache: "no-store" });
      const json = await res.json();
      const v = json?.data || {};
      setter({ enabled: Boolean(v.enabled), keys: v.keys || {}, methods: Array.isArray(v.methods) ? v.methods : [], loading: false });
    } catch (e: any) {
      setter({ enabled: false, keys: {}, methods: [], loading: false, error: e?.message || "Gagal memuat" });
    }
  }

  async function toggleEnable(name: GwName, current: GwState, setter: Dispatch<SetStateAction<GwState>>) {
    const nextEnabled = !current.enabled;
    setter({ ...current, enabled: nextEnabled, saving: true, error: undefined, savedMsg: undefined });
    try {
      const res = await fetch(`/api/admin/gateways/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, keys: current.keys || {}, methods: current.methods || [] }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Gagal menyimpan");
      setter({ ...current, enabled: nextEnabled, saving: false, savedMsg: "Tersimpan" });
    } catch (e: any) {
      // Revert on failure
      setter({ ...current, enabled: !nextEnabled, saving: false, error: e?.message || "Gagal menyimpan" });
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Payment Gateway • Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <GatewayCard
          name="Midtrans"
          docLink="https://midtrans.com/"
          manageHref="/admin/payment-gateway/midtrans"
          state={midtrans}
          onToggle={() => toggleEnable("midtrans", midtrans, setMidtrans)}
          keyStatus={midtransKeyStatus(midtrans.keys)}
        />
        <GatewayCard
          name="Xendit"
          docLink="https://xendit.co/"
          manageHref="/admin/payment-gateway/xendit"
          state={xendit}
          onToggle={() => toggleEnable("xendit", xendit, setXendit)}
          keyStatus={xenditKeyStatus(xendit.keys)}
        />
        <GatewayCard
          name="Moota"
          docLink="https://moota.co/"
          manageHref="/admin/payment-gateway/moota"
          state={moota}
          onToggle={() => toggleEnable("moota", moota, setMoota)}
          keyStatus={mootaKeyStatus(moota.keys)}
        />
      </div>
    </div>
  );
}

function GatewayCard({ name, docLink, manageHref, state, onToggle, keyStatus }: {
  name: string;
  docLink: string;
  manageHref: string;
  state: GwState;
  onToggle: () => void;
  keyStatus: { ok: boolean; text: string };
}) {
  const methods = state.methods || [];
  const badgeCls = state.enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-medium">{name}</div>
          <div className="text-xs text-slate-500">Status: <span className={`px-2 py-0.5 rounded ${badgeCls}`}>{state.enabled ? "Enabled" : "Disabled"}</span></div>
        </div>
        <button
          onClick={onToggle}
          disabled={state.loading || state.saving}
          className="px-3 py-1.5 rounded text-sm bg-indigo-600 text-white disabled:opacity-60"
        >
          {state.saving ? "Menyimpan…" : state.enabled ? "Matikan" : "Aktifkan"}
        </button>
      </div>

      <div className="mt-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="text-slate-600">Methods</div>
          <div className="text-right text-slate-900 font-medium">{methods.length || 0}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500 truncate">
          {methods.length ? methods.join(", ") : "Belum dipilih"}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-slate-600">Kunci/API</div>
          <span className={`text-xs px-2 py-0.5 rounded ${keyStatus.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {keyStatus.text}
          </span>
        </div>
      </div>

      {state.error && <div className="mt-2 text-xs text-rose-600">{state.error}</div>}
      {state.savedMsg && <div className="mt-2 text-xs text-emerald-700">{state.savedMsg}</div>}

      <div className="mt-4 flex items-center gap-2 text-sm">
        <Link href={manageHref} className="px-3 py-2 rounded bg-slate-900 text-white">Kelola</Link>
        <a href={docLink} target="_blank" rel="noreferrer" className="text-slate-600 hover:underline">Dokumentasi</a>
      </div>
    </div>
  );
}

function midtransKeyStatus(keys: Record<string, any>): { ok: boolean; text: string } {
  const server = typeof keys?.serverKey === "string" && keys.serverKey.trim().length > 0;
  const client = typeof keys?.clientKey === "string" && keys.clientKey.trim().length > 0;
  return server && client ? { ok: true, text: "Lengkap" } : server || client ? { ok: false, text: "Sebagian" } : { ok: false, text: "Belum diisi" };
}

function xenditKeyStatus(keys: Record<string, any>): { ok: boolean; text: string } {
  const sk = typeof keys?.secretKey === "string" && keys.secretKey.trim().length > 0;
  return sk ? { ok: true, text: "Terisi" } : { ok: false, text: "Belum diisi" };
}

function mootaKeyStatus(keys: Record<string, any>): { ok: boolean; text: string } {
  const ak = typeof keys?.apiKey === "string" && keys.apiKey.trim().length > 0;
  return ak ? { ok: true, text: "Terisi" } : { ok: false, text: "Belum diisi" };
}
