import Client from "@/app/gamification/pet/petClient";
import { GAMIFICATION_ENABLED } from "@/lib/runtimeConfig";
import { getDb } from "@/lib/mongodb";

export default async function PetPage() {
  let enabled = GAMIFICATION_ENABLED;
  try {
    const db = await getDb();
    const s: any = await db.collection("settings").findOne({ _id: "main" as any });
    if (s) enabled = Boolean(s.gamification_enabled === true || s.gamification_enabled === "on" || s.gamification_enabled === "true");
  } catch {}
  if (!enabled) {
    return (
      <main className="min-h-screen pb-28">
        <div className="mx-auto max-w-md px-4 pt-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Gamification Dimatikan</h1>
          <p className="text-slate-600 mt-1">Fitur masih dalam perawatan. Silakan kembali lagi nanti.</p>
          <a href="/" className="inline-block mt-4 text-sm font-semibold text-blue-600">← Kembali ke Beranda</a>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen pb-28">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">GimPet</h1>
          <a href="/gamification" className="text-sm text-blue-600 font-semibold">← Kembali</a>
        </div>
        <p className="text-slate-600 mt-1">Rawat peliharaanmu, tingkatkan level, dan kumpulkan koin.</p>

        <div className="mt-4">
          <Client />
        </div>
      </div>
    </main>
  );
}
