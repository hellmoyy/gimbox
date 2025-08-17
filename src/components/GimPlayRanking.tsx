"use client";

import { useMemo, useState } from "react";

type Entry = { name: string; prize: number; points: number };

const DATA: Record<"daily" | "weekly" | "monthly", Entry[]> = {
  daily: [
    { name: "John", prize: 1000, points: 9500 },
    { name: "Zuhr", prize: 800, points: 8400 },
    { name: "Eva", prize: 600, points: 7900 },
    { name: "Kat", prize: 400, points: 5200 },
    { name: "Elon", prize: 300, points: 4300 },
  { name: "Roger", prize: 200, points: 3700 },
  { name: "Maya", prize: 160, points: 3200 },
  { name: "Niko", prize: 140, points: 2800 },
  { name: "Sari", prize: 120, points: 2400 },
  { name: "Dika", prize: 100, points: 2000 },
  ],
  weekly: [
    { name: "John", prize: 5730, points: 42500 },
    { name: "Zuhr", prize: 4500, points: 39680 },
    { name: "Eva", prize: 3200, points: 32809 },
    { name: "Kat", prize: 2200, points: 19587 },
    { name: "Elon", prize: 2200, points: 15897 },
  { name: "Roger", prize: 1800, points: 12736 },
  { name: "Maya", prize: 1500, points: 11220 },
  { name: "Niko", prize: 1400, points: 10800 },
  { name: "Sari", prize: 1300, points: 9720 },
  { name: "Dika", prize: 1200, points: 8910 },
  ],
  monthly: [
    { name: "John", prize: 12000, points: 172500 },
    { name: "Zuhr", prize: 10500, points: 153680 },
    { name: "Eva", prize: 8800, points: 141209 },
    { name: "Kat", prize: 7600, points: 112587 },
    { name: "Elon", prize: 7200, points: 98597 },
  { name: "Roger", prize: 6800, points: 92736 },
  { name: "Maya", prize: 6400, points: 81200 },
  { name: "Niko", prize: 6000, points: 76890 },
  { name: "Sari", prize: 5600, points: 70210 },
  { name: "Dika", prize: 5200, points: 65800 },
  ],
};

export default function GimPlayRanking() {
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("weekly");
  const ranks = useMemo(() => DATA[tab], [tab]);
  const top3 = ranks.slice(0, 3);
  // Visually arrange podium as [2nd, 1st, 3rd] so the winner sits in the middle
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as Entry[];
  const others = ranks.slice(3);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-slate-900">Leaderboard</div>
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          {[
            { key: "daily", label: "Harian" },
            { key: "weekly", label: "Mingguan" },
            { key: "monthly", label: "Bulanan" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {podium.map((p, colIdx) => {
          const heights = ["h-24", "h-28", "h-20"]; // 2nd, 1st (tallest), 3rd
          const rank = ranks.indexOf(p) + 1; // real rank number

          const style =
            rank === 1
              ? {
                  from: "from-amber-300",
                  to: "to-yellow-100",
                  ring: "ring-amber-400",
                  chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                  icon: "👑",
                }
              : rank === 2
              ? {
                  from: "from-slate-300",
                  to: "to-slate-100",
                  ring: "ring-slate-300",
                  chip: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
                  icon: "🥈",
                }
              : {
                  from: "from-orange-300",
                  to: "to-amber-100",
                  ring: "ring-orange-300",
                  chip: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
                  icon: "🥉",
                };

          return (
            <div key={p.name} className="flex flex-col items-center">
              <div
                className={`relative w-full ${heights[colIdx]} rounded-2xl overflow-hidden shadow-sm`}
              >
                <div className={`absolute inset-0 bg-gradient-to-t ${style.from} ${style.to}`} />
                <div className="absolute -top-2 right-2 text-lg">{style.icon}</div>
                <div className="relative z-10 h-full flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-600">{p.points.toLocaleString()} pts</div>
                  </div>
                  <div className="absolute bottom-1 left-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 text-slate-700 backdrop-blur-sm">Peringkat {rank}</span>
                  </div>
                </div>
              </div>
              <div className={`mt-1 text-[12px] px-2 py-0.5 rounded-full ${style.chip}`}>Rp{p.prize.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Others */}
      <div className="divide-y divide-slate-200 mt-3">
        {others.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 grid place-items-center text-[11px] font-bold text-slate-700">
                {i + 4}
              </div>
              <div className="text-slate-900 font-medium">{r.name}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-slate-700">Rp{r.prize.toLocaleString()}</div>
              <div className="text-slate-500">{r.points.toLocaleString()} pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
