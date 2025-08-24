"use client";
import { useState } from 'react';
import SmartImage from './SmartImage';

export type BrandItem = { code: string; name: string; icon?: string };

export default function BrandGrid({ items, showLimit = 12 }: { items: BrandItem[]; showLimit?: number }) {
  const [visibleCount, setVisibleCount] = useState(showLimit);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  return (
    <div>
  <div className="grid grid-cols-4 gap-3">
        {visible.map((b) => (
          <div key={b.code} className="bg-[#fefefe] rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition p-2 w-full">
            <a href={`/topup/${b.code}`} className="flex flex-col items-center text-center">
              <div className="relative w-full aspect-square">
                <SmartImage src={b.icon || '/images/logo/gimbox.gif'} alt={b.name} className="w-full h-full rounded-xl object-cover" />
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-[#111827] line-clamp-2 leading-snug min-h-[32px]">{b.name}</div>
            </a>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-3 text-center">
          <button
            type="button"
            className="text-[#0d6efd] hover:underline font-medium"
            onClick={() => setVisibleCount(c => Math.min(items.length, c + showLimit))}
          >Selengkapnya</button>
        </div>
      )}
    </div>
  );
}
