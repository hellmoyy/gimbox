"use client";
import Link from "next/link";

const SAMPLE = [
  { id: "ninja", title: "Run Ninja Run", prize: 20000, players: 57864, timeLeft: "02:47:55", cover: "/images/vouchers/garena.jpg" },
  { id: "tank", title: "Tank Battle", prize: 7500, players: 12675, timeLeft: "01:12:30", cover: "/images/games/valorant.jpg" },
];

export default function GimPlayTournaments() {
  return (
    <div className="mt-5">
      <div className="text-base font-semibold text-slate-900 mb-2">Top Tournaments</div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {SAMPLE.map((t) => (
          <div key={t.id} className="snap-start shrink-0 w-[280px] rounded-2xl overflow-hidden border border-slate-200 bg-[#fefefe] shadow-sm">
            <div className="relative">
              <img src={t.cover} alt={t.title} className="h-36 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">{t.title}</div>
                  <div className="text-white/80 text-xs">Win Rp{t.prize.toLocaleString()}</div>
                </div>
                <Link href="#" className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white shadow">Play</Link>
              </div>
            </div>
            <div className="px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
              <span>👥 {t.players.toLocaleString()} pemain</span>
              <span>⏳ {t.timeLeft}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
