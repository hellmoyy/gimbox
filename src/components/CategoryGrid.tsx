"use client";
import { useState } from "react";
import SmartImage from "./SmartImage";

type Product = {
  code: string;
  name: string;
  icon?: string;
  discountPercent?: number;
};

export default function CategoryGrid({ items, showLimit = 8 }: { items: Product[]; showLimit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, showLimit);
  const hasMore = items.length > showLimit && !expanded;

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {visible.map((p) => (
          <div key={p.code} className="bg-[#fefefe] rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-1.5 w-full">
            <a href={`/topup/${p.code}`} className="block">
              <div className="relative">
                <SmartImage src={(p.icon as unknown as string) || "/placeholder.png"} alt={p.name} className="w-full aspect-square rounded-xl object-cover" />
                {p.discountPercent ? (
                  <div className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">-{p.discountPercent}%</div>
                ) : null}
              </div>
              <div className="mt-1.5 text-[13px] text-center font-semibold text-[#111827]">{p.name}</div>
            </a>
          </div>
        ))}
      </div>
      {hasMore ? (
        <div className="mt-3 text-center">
          <button
            type="button"
            className="text-[#0d6efd] hover:underline font-medium"
            onClick={() => setExpanded(true)}
          >
            Selengkapnya
          </button>
        </div>
      ) : null}
    </div>
  );
}
