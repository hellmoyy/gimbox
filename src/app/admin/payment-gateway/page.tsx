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
  const [activePayments, setActivePayments] = useState<Array<{ id: string; label: string; gateway: string; method: string; logoUrl?: string; enabled: boolean; sort: number; feeType?: 'flat'|'percent'; feeValue?: number }>>([]);
  const [apSaving, setApSaving] = useState(false);
  const [editingIds, setEditingIds] = useState<string[]>([]);

  useEffect(() => {
    // Load all gateway configs in parallel
    (async () => {
      await Promise.all([
        loadGw("midtrans", setMidtrans),
        loadGw("xendit", setXendit),
        loadGw("moota", setMoota),
      ]);
      // Load active payments after gateways
      try {
        const r = await fetch('/api/admin/gateways/active-payments', { cache: 'no-store' });
        const j = await r.json();
        const items = Array.isArray(j?.data?.items) ? j.data.items : [];
        setActivePayments(items.sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0)));
      } catch {}
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
      <div className="grid gap-4 mb-6">
        <Link href="/admin/payment-gateway/midtrans" className="block p-4 border rounded hover:bg-slate-50">Midtrans</Link>
        <Link href="/admin/payment-gateway/xendit" className="block p-4 border rounded hover:bg-slate-50">Xendit</Link>
        <Link href="/admin/payment-gateway/moota" className="block p-4 border rounded hover:bg-slate-50">Moota</Link>
        <Link href="/admin/payment-gateway/duitku" className="block p-4 border rounded hover:bg-slate-50">Duitku</Link>
      </div>
  {/* Helpers */}
  {/* Build method options based on each gateway's configured methods */}
  {(() => null)()}
      {/* Active Payments Manager */}
  <div className="rounded-xl border p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Active Payment</div>
          <button
            onClick={async () => {
              setApSaving(true);
              try {
                const items = activePayments.map((it, idx) => ({ ...it, sort: idx }));
                const res = await fetch('/api/admin/gateways/active-payments', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items })
                });
                const j = await res.json();
                if (!j?.success) throw new Error(j?.message || 'Gagal menyimpan');
              } catch (e) { /* show toast later if needed */ }
              finally { setApSaving(false); }
            }}
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
            disabled={apSaving}
          >{apSaving ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
        <div className="mt-3 text-xs text-slate-500">Atur daftar metode yang ditampilkan ke user. Drag untuk susun urutan. Toggle untuk aktif/nonaktif. Hanya metode yang aktif di masing-masing gateway yang muncul pada pilihan.</div>
        <div className="mt-3 divide-y rounded-lg border overflow-hidden">
          {activePayments.map((it, idx) => (
            <ActivePaymentRow
              key={it.id}
              item={it}
              index={idx}
              onChange={(ni) => setActivePayments((arr) => arr.map(x => x.id===ni.id?ni:x))}
              onMove={(from, to) => setActivePayments((arr) => { const a = [...arr]; const [sp] = a.splice(from,1); a.splice(to,0,sp); return a; })}
              onDelete={(id) => setActivePayments((arr) => arr.filter(x => x.id !== id))}
              methodsMap={{
                midtrans: Array.isArray(midtrans.methods) ? midtrans.methods : [],
                xendit: Array.isArray(xendit.methods) ? xendit.methods : [],
                moota: Array.isArray(moota.methods) ? moota.methods : [],
              }}
              editing={editingIds.includes(it.id)}
              onToggleEdit={(id) => setEditingIds((list) => list.includes(id) ? list.filter(x=>x!==id) : [...list, id])}
            />
          ))}
          {activePayments.length === 0 && (
            <div className="p-4 text-sm text-slate-500">Belum ada item. Tambahkan dari gateway yang aktif.</div>
          )}
        </div>
        <div className="mt-3">
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => setActivePayments((arr) => {
              const methodsMap = {
                midtrans: Array.isArray(midtrans.methods) ? midtrans.methods : [],
                xendit: Array.isArray(xendit.methods) ? xendit.methods : [],
                moota: Array.isArray(moota.methods) ? moota.methods : [],
              } as Record<string, string[]>;
              const order: Array<keyof typeof methodsMap> = ['midtrans','xendit','moota'];
              const gw = order.find(g => (methodsMap[g] || []).length > 0) || 'midtrans';
              const m = (methodsMap[gw] || [])[0] || '';
              const methodLabels: Record<string, string> = { qris: 'QRIS', va_bca: 'VA BCA', va_bni: 'VA BNI', va_bri: 'VA BRI', va_permata: 'Permata VA', gopay: 'GoPay', shopeepay: 'ShopeePay', ovo: 'OVO', dana: 'Dana', linkaja: 'LinkAja', bank_transfer: 'Transfer Bank' };
              const label = methodLabels[m] || (m ? m : 'Metode');
              return ([...arr, { id: `${Date.now()}`, label, gateway: gw, method: m, logoUrl: '', enabled: true, sort: arr.length }]);
            })}
          >+ Tambah Item</button>
        </div>
      </div>
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

function ActivePaymentRow({ item, index, onChange, onMove, onDelete, methodsMap, editing, onToggleEdit }: {
  item: { id: string; label: string; gateway: string; method: string; logoUrl?: string; enabled: boolean; sort: number; feeType?: 'flat'|'percent'; feeValue?: number };
  index: number;
  onChange: (item: any) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (id: string) => void;
  methodsMap: Record<string, string[]>;
  editing: boolean;
  onToggleEdit: (id: string) => void;
}) {
  // Available methods per gateway (keeps in sync with gateway pages)
  const gwMethods = methodsMap;
  const methodLabels: Record<string, string> = {
    qris: "QRIS",
    va_bca: "VA BCA",
    va_bni: "VA BNI",
    va_bri: "VA BRI",
    va_permata: "Permata VA",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    ovo: "OVO",
    dana: "Dana",
    linkaja: "LinkAja",
    bank_transfer: "Transfer Bank",
  };
  const options = gwMethods[item.gateway] || [];

  async function onFile(e: any) {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('folder', 'payments'); fd.append('name', `${item.label || 'pay'}`);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) {
        const msg = j?.error || 'Upload gagal';
        if (res.status === 401) alert('Sesi admin berakhir. Silakan login ulang, lalu coba unggah lagi.');
        else alert(msg);
        return;
      }
      if (j?.url) onChange({ ...item, logoUrl: j.url });
    } catch (err: any) {
      alert('Upload gagal. Periksa koneksi internet Anda.');
    } finally {
      e.target.value = '';
    }
  }
  const up = () => onMove(index, Math.max(0, index-1));
  const down = () => onMove(index, index+1);
  return (
    <div className="flex flex-wrap md:flex-nowrap items-start gap-4 p-3 bg-white">
      <div className="flex flex-col items-center gap-1 w-8 shrink-0 mr-3">
        <button title="Up" onClick={up} className="px-1.5 py-1 border rounded disabled:opacity-40" disabled={index===0}>↑</button>
        <button title="Down" onClick={down} className="px-1.5 py-1 border rounded">↓</button>
      </div>
      <div className="w-12 h-12 shrink-0 rounded bg-slate-100 border overflow-hidden flex items-center justify-center">
        {item.logoUrl ? (<img src={item.logoUrl} alt={item.label} className="w-full h-full object-contain" />) : (
          <span className="text-xs text-slate-400">No Logo</span>
        )}
      </div>
  <div className="flex-1 grid gap-3 items-end w-full md:[grid-template-columns:2fr_1fr_1fr_1.5fr]">
        <div>
          <div className="text-xs text-slate-500">Label</div>
          <input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} className="w-full min-w-[200px] border rounded px-2 py-1.5 text-sm" disabled={!editing} />
        </div>
        <div>
          <div className="text-xs text-slate-500">Gateway</div>
          <select
            value={item.gateway}
            onChange={(e) => {
              const gw = e.target.value;
              const newOptions = gwMethods[gw] || [];
              const nextMethod = newOptions.includes(item.method) ? item.method : (newOptions[0] || "");
              onChange({ ...item, gateway: gw, method: nextMethod });
            }}
            className="w-full min-w-[140px] border rounded px-2 py-1.5 text-sm"
            disabled={!editing}
          >
            <option value="midtrans">Midtrans</option>
            <option value="xendit">Xendit</option>
            <option value="moota">Moota</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">Method</div>
          <select
            value={item.method}
            onChange={(e) => onChange({ ...item, method: e.target.value })}
            className="w-full min-w-[180px] border rounded px-2 py-1.5 text-sm"
            disabled={!editing}
          >
            {options.length === 0 ? (
              <option value="">Pilih method</option>
            ) : null}
            {options.map((m) => (
              <option key={m} value={m}>{methodLabels[m] || m}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">Fee</div>
          <div className="flex items-center gap-2">
            <select
              value={item.feeType || 'flat'}
              onChange={(e) => onChange({ ...item, feeType: (e.target.value as 'flat'|'percent') })}
              className="border rounded px-2 py-1.5 text-sm"
              disabled={!editing}
            >
              <option value="flat">Nominal</option>
              <option value="percent">Persen</option>
            </select>
            <input
              type="number"
              className="w-28 border rounded px-2 py-1.5 text-sm"
              placeholder={item.feeType === 'percent' ? '0.5' : '1000'}
              value={typeof item.feeValue === 'number' ? item.feeValue : 0}
              onChange={(e) => onChange({ ...item, feeValue: Number(e.target.value) })}
              disabled={!editing}
              step={item.feeType === 'percent' ? 0.1 : 100}
              min={0}
            />
            <span className="text-xs text-slate-500">{(item.feeType || 'flat') === 'percent' ? '%' : 'Rp'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
        <label className={`px-2 py-1.5 border rounded text-sm ${editing ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
          Upload Logo
          <input type="file" className="hidden" onChange={onFile} accept="image/*" disabled={!editing} />
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ ...item, enabled: e.target.checked })} disabled={!editing} />
          <span>Aktif</span>
        </label>
        <button
          type="button"
          className="ml-1 px-2 py-1.5 border text-slate-700 hover:bg-slate-50 rounded text-sm"
          onClick={() => onToggleEdit(item.id)}
        >{editing ? 'Selesai' : 'Edit'}</button>
        <button
          type="button"
          className="ml-1 px-2 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-sm"
          onClick={() => {
            const msg = `Ketik HAPUS untuk menghapus:\n${item.label || '(tanpa label)'} — ${item.gateway}/${item.method}`;
            const ans = window.prompt(msg, '');
            if (!ans) return;
            if (ans.trim().toUpperCase() !== 'HAPUS') return;
            onDelete(item.id);
          }}
        >Hapus</button>
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
