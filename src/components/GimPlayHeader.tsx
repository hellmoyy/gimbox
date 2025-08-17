"use client";
export default function GimPlayHeader() {
  // Placeholder balances; wire to real data later
  const coin = 20;
  const ticket = 3;
  const points = 475;
  return (
    <div className="flex items-center gap-2 overflow-auto">
      <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
        <span className="text-yellow-500">🪙</span>
        <span className="text-sm font-semibold text-slate-900">{coin}</span>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
        <span className="text-violet-600">🎟️</span>
        <span className="text-sm font-semibold text-slate-900">{ticket}</span>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
        <span className="text-blue-600">⭐</span>
        <span className="text-sm font-semibold text-slate-900">{points}</span>
      </div>
    </div>
  );
}
