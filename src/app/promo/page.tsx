"use client";
import { useEffect, useState } from "react";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function PromoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/public/promos", { cache: "no-store" });
        if (!res.ok) throw new Error("fail");
        const j = await res.json();
        if (!ignore && Array.isArray(j?.items)) setItems(j.items);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);
  return (
    <main className="min-h-screen pb-24">
      {loading && <LoadingOverlay label="Memuat promo..." size={64} />}
      <div className="mx-auto w-full max-w-md md:max-w-6xl px-4 mt-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Promo</h1>
        {(!loading && items.length === 0) ? (
          <div className="rounded-xl border border-slate-200 bg-white/90 p-6 text-center text-slate-600">
            Belum ada promo aktif saat ini.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {items.map((p: any) => (
              <li key={p._id || p.id} className="rounded-2xl overflow-hidden border border-slate-100 bg-white/90 shadow-sm">
                <div className="relative h-36 sm:h-40 md:h-36 lg:h-40">
                  <div
                    className={`absolute inset-0 ${p.image ? "" : "bg-slate-200"}`}
                    style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  />
                  {p.url ? (
                    <a href={p.url} className="absolute inset-0 z-10" aria-label={p.title || "Promo"} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
