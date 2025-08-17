"use client";

const RANKS = [
  { name: "John", prize: 5730, points: 42500 },
  { name: "Zuhr", prize: 4500, points: 39680 },
  { name: "Eva", prize: 3200, points: 32809 },
  { name: "Kat", prize: 2200, points: 19587 },
  { name: "Elon", prize: 2200, points: 15897 },
  { name: "Roger", prize: 1800, points: 12736 },
];

export default function GimPlayRanking() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="text-base font-semibold text-slate-900 mb-3">Ranking & Rewards</div>
      <div className="divide-y divide-slate-200">
        {RANKS.map((r, i) => (
          <div key={r.name} className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-200 grid place-items-center text-[11px] font-bold text-slate-700">
                {i + 1}
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
