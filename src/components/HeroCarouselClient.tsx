"use client";
import { useEffect, useState } from "react";

export type HeroSlide = {
  title: string;
  subtitle?: string;
  color?: string;
};

export default function HeroCarouselClient({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!slides?.length) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides?.length]);

  const current = slides?.[i] || { title: "", subtitle: "", color: "from-slate-400 to-slate-600" };

  return (
    <div className="mx-auto max-w-6xl px-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <div className={`rounded-2xl shadow overflow-hidden bg-gradient-to-r ${current.color || "from-slate-400 to-slate-600"} text-white p-8 min-h-[160px] flex flex-col justify-center`}>
          <h2 className="text-2xl font-bold">{current.title}</h2>
          {current.subtitle ? <p className="opacity-90">{current.subtitle}</p> : null}
        </div>
      </div>
      <div className="hidden md:block">
        <div className="rounded-2xl shadow overflow-hidden bg-gradient-to-r from-slate-200 to-slate-100 p-6 min-h-[160px] flex items-center">
          <div>
            <div className="text-xl font-semibold text-slate-800">Promo Spesial</div>
            <div className="text-slate-600">Cek promo terbaru kami minggu ini</div>
          </div>
        </div>
      </div>
    </div>
  );
}
