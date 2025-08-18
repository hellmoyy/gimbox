import GimPlayHeader from "../../components/GimPlayHeader";
import GimPlayRanking from "../../components/GimPlayRanking";
// Note: GimPlayPet lives on /gamification/pet; this page links to it.
import GimPlayHero from "../../components/GimPlayHero";
import TukarPointCard from "../../components/TukarPointCard";
import { GAMIFICATION_ENABLED } from "@/lib/runtimeConfig";
import { getDb } from "@/lib/mongodb";

export default async function GamificationPage() {
  // Feature flag guard (DB overrides env)
  let enabled = GAMIFICATION_ENABLED;
  try {
    const db = await getDb();
    const s: any = await db.collection("settings").findOne({ _id: "main" as any });
    if (s) {
      enabled = Boolean(s.gamification_enabled === true || s.gamification_enabled === "on" || s.gamification_enabled === "true");
    }
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
    <main className="min-h-screen pb-28 bg-[linear-gradient(180deg,#ecf2ff,#fff)]">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">GimPlay</h1>
          <GimPlayHeader />
        </div>
        <p className="text-slate-600 mt-1">Main game ringan, kumpulkan point, dan ikuti turnamen.</p>

        <div className="mt-4">
          <GimPlayHero />
        </div>
        



  {/* Buka GimPet CTA removed as requested */}

  <GimPlayRanking />

        {/* Rewards moved below leaderboard */}
        <div className="mt-4">
          <TukarPointCard />
        </div>
      </div>
    </main>
  );
}
