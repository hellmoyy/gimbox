import GimPlayHeader from "../../components/GimPlayHeader";
import GimPlayRanking from "../../components/GimPlayRanking";
// Note: GimPlayPet lives on /gamification/pet; this page links to it.
import GimPlayHero from "../../components/GimPlayHero";
import TukarPointCard from "../../components/TukarPointCard";

export default async function GamificationPage() {
  // Placeholder data removed with stats cards

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
