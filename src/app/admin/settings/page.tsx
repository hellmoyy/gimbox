import { getDb } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

async function getSettings() {
  try {
    const db = await getDb();
    const s = await db.collection("settings").findOne({ _id: "main" as any });
    return s || {};
  } catch (e) {
    console.warn("[admin/settings] DB error:", (e as any)?.message || e);
    return {};
  }
}

export default async function SettingsPage() {
  const s: any = await getSettings();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Pengaturan</h1>
      <form action="/api/admin/settings" method="post" className="grid gap-4">
        <div className="grid gap-2">
          <h2 className="font-semibold">Fitur</h2>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="gamification_enabled" defaultChecked={s.gamification_enabled === true || s.gamification_enabled === "on" || s.gamification_enabled === "true"} />
            <span>Aktifkan Gamification (GimPet/GimPlay)</span>
          </label>
          <div className="text-xs text-slate-500">Jika dimatikan, menu di bottom nav disembunyikan dan halaman /gamification diblokir.</div>
        </div>
        <div className="grid gap-2">
          <h2 className="font-semibold">Payment Gateway</h2>
          <input name="midtrans_server_key" defaultValue={s.midtrans_server_key || ""} placeholder="Midtrans Server Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="xendit_secret_key" defaultValue={s.xendit_secret_key || ""} placeholder="Xendit Secret Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
        </div>

        <div className="grid gap-2">
          <h2 className="font-semibold mt-2">Otomatisasi Sync</h2>
          <div className="text-xs text-slate-500">Atur token dan provider yang akan disinkronkan oleh cronjob.</div>
          <input name="sync_token" defaultValue={s.sync_token || ""} placeholder="Cron Sync Token (wajib untuk endpoint /api/admin/sync/cron)" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="sync_providers" defaultValue={s.sync_providers || "vcgamers"} placeholder="Provider disinkron (comma/space separated), contoh: vcgamers digiflazz iak" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <div className="text-xs text-slate-500">
            Endpoint: <code className="bg-slate-100 px-1 rounded">/api/admin/sync/cron?token=TOKEN</code> • Pakai di cron scheduler (GitHub Actions, UptimeRobot, EasyCron, dst).
          </div>
          {s.sync_lastRunAt && (
            <div className="text-xs text-slate-600">Terakhir jalan: {new Date(s.sync_lastRunAt).toLocaleString()} • Hasil: {Array.isArray(s.sync_lastResult) ? s.sync_lastResult.map((r: any) => `${r.provider}:${r.count ?? (r.error ? 'err' : 0)}`).join(", ") : '-'}</div>
          )}
        </div>

        <div className="grid gap-2">
          <h2 className="font-semibold mt-2">Provider</h2>
          <input name="digiflazz_username" defaultValue={s.digiflazz_username || ""} placeholder="Digiflazz Username" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="digiflazz_api_key" defaultValue={s.digiflazz_api_key || ""} placeholder="Digiflazz API Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="iak_username" defaultValue={s.iak_username || ""} placeholder="IAK Username" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="iak_api_key" defaultValue={s.iak_api_key || ""} placeholder="IAK API Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="iak_secret" defaultValue={s.iak_secret || ""} placeholder="IAK Secret" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
        </div>

        <div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">Simpan</button>
        </div>
      </form>
    </div>
  );
}
