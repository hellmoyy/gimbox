"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Array<{ name: string; code: string; icon: string }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Fetch products once when popup first opens
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    setLoading(true);
  fetch("/api/brands")
      .then((r) => r.json())
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res?.data) ? res.data : [];
    setBrands(data);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, loaded]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setHighlight(-1);
      }
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as typeof brands;
    return brands.filter((b) => b.name?.toLowerCase().includes(term) || b.code?.toLowerCase().includes(term));
  }, [q, brands]);

  function goTo(idx: number) {
    const item = filtered[idx];
    if (!item) return;
    setOpen(false);
    setHighlight(-1);
  router.push(`/topup/${item.code}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min((filtered.length ? filtered.length - 1 : 0), h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(-1, h - 1));
    } else if (e.key === "Enter") {
      if (highlight >= 0) {
        e.preventDefault();
        goTo(highlight);
      }
    }
  }
  return (
  <header className="sticky top-0 z-40 w-full bg-[#fefefe] text-slate-800 border-b border-slate-200/60 backdrop-blur-[2px]">
      <div className="bg-[#fefefe] text-slate-800">
  <div className="mx-auto w-full max-w-md px-4 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <img src="/images/logo/gimbox.gif" alt="Gimbox" className="h-[28px] w-auto" />
          </Link>
          <div className="relative flex-1 max-w-xl" ref={containerRef}>
            <input
              value={q}
              onChange={(e)=>{
                setQ(e.target.value);
                setOpen(e.target.value.trim().length > 0);
                setHighlight(-1);
              }}
              onFocus={() => {
                if (q.trim().length > 0) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder="Cari Brand"
              className="w-full rounded-full border border-slate-300/60 bg-[#fefefe] text-slate-900 placeholder-slate-400 px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 w-5 h-5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {open && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg">
                <div className="max-h-80 overflow-auto py-1">
                  {loading && (
                    <div className="px-4 py-3 text-sm text-slate-500">Mencari…</div>
                  )}
                  {!loading && filtered.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-500">Tidak ada hasil</div>
                  )}
                  {!loading && filtered.slice(0, 10).map((it: any, idx: number) => (
                    <button
                      key={it.code}
                      type="button"
                      onClick={() => goTo(idx)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-slate-50 ${idx === highlight ? 'bg-slate-100' : ''}`}
                    >
                      <img src={it.icon} alt="" className="w-8 h-8 rounded object-cover" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{it.name}</div>
                        <div className="text-xs text-slate-500">{it.code}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
