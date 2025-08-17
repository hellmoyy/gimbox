"use client";
import { useMemo, useState } from "react";

type Reward = { name: string; pts: number; icon?: string; img?: string; alt?: string; cat: "console" | "rog" | "apparel" };

export default function TukarPointCard() {
  const items: Reward[] = [
    { name: "PlayStation 5", pts: 50000, img: "/images/games/reward-shop/ps5.png", alt: "PlayStation 5", cat: "console" },
    { name: "Nintendo Switch", pts: 35000, img: "/images/games/reward-shop/nintedo-switch.png", alt: "Nintendo Switch", cat: "console" },
    { name: "Samsung Tablet", pts: 25000, img: "/images/games/reward-shop/tablet-samsung.png", alt: "Samsung Tablet", cat: "console" },
    { name: "ROG Phone", pts: 30000, img: "/images/games/reward-shop/rogphone.png", alt: "ROG Phone", cat: "rog" },
    { name: "ROG Laptop", pts: 80000, img: "/images/games/reward-shop/roglaptop.png", alt: "ROG Laptop", cat: "rog" },
    { name: "T-Shirt", pts: 3000, icon: "👕", cat: "apparel" },
    { name: "Topi", pts: 2000, icon: "🧢", cat: "apparel" },
    { name: "Hoodie", pts: 6000, icon: "🧥", cat: "apparel" },
  ];

  const tabs = [
    { key: "all", label: "Semua" },
    { key: "console", label: "Console" },
    { key: "rog", label: "ROG" },
    { key: "apparel", label: "Apparel" },
  ] as const;
  type TabKey = typeof tabs[number]["key"];
  const [tab, setTab] = useState<TabKey>("all");
  const filtered = useMemo(() => {
    const list = tab === "all" ? items : items.filter((i) => i.cat === tab);
    return [...list].sort((a, b) => b.pts - a.pts);
  }, [items, tab]);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="font-semibold text-slate-900">Tukar Point</div>
      <p className="text-sm text-slate-600 mt-1">Tukar point kamu dengan hadiah pilihan berikut.</p>

      {/* Tabs */}
      <div className="mt-3 flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              tab === t.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {filtered.map((it) => (
          <div key={it.name} className="rounded-lg border border-slate-200 p-3 bg-white">
            <div className="flex items-start gap-2">
              {it.img ? (
                <img src={it.img} alt={it.alt || it.name} className="h-10 w-10 object-contain select-none" />
              ) : (
                <div className="text-xl select-none">{it.icon}</div>
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 leading-tight">{it.name}</div>
                <div className="text-xs text-slate-600">{it.pts.toLocaleString()} Point</div>
              </div>
            </div>
            <button
              onClick={() => alert("Penukaran segera hadir")}
              className="mt-2 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Tukar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
