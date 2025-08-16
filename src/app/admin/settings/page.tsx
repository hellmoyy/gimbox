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
          <h2 className="font-semibold">Payment Gateway</h2>
          <input name="midtrans_server_key" defaultValue={s.midtrans_server_key || ""} placeholder="Midtrans Server Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
          <input name="xendit_secret_key" defaultValue={s.xendit_secret_key || ""} placeholder="Xendit Secret Key" className="border border-slate-300 rounded px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe]" />
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
