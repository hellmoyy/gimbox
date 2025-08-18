"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GAMIFICATION_ENABLED } from "@/lib/runtimeConfig";

const items = [
  { href: "/", label: "Home", icon: "/images/icon/home.svg" },
  { href: "/promo", label: "Promo", icon: "/images/icon/discount.svg" },
  // Center action (Gercep) is rendered separately
  { href: "/transactions", label: "Transaksi", icon: "/images/icon/transaction.svg" },
  { href: "/account", label: "Akun", icon: "/images/icon/account.svg" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const navCls = useMemo(() => `fixed inset-x-0 bottom-0 z-50 translate-y-0 opacity-100`,[]);
  // Init as false to avoid brief flash of center button when feature is OFF; will turn true after fetch
  const [gamiOn, setGamiOn] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const j = await res.json();
        if (!ignore) {
          const next = Boolean(j?.gamification_enabled ?? true);
          if (next !== gamiOn) setGamiOn(next);
        }
      } catch {
        // keep current optimistic state to avoid flicker
      }
    })();
    return () => { ignore = true; };
  }, [gamiOn]);

  return (
    <nav className={navCls} aria-hidden={false}>
      <div className="mx-auto w-full max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="relative bg-[#fefefe]/95 backdrop-blur rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between px-3 py-2 text-sm text-slate-700">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1 ${active ? "text-[#0d6efd]" : "text-slate-600"}`}
              >
                <img src={it.icon} alt={it.label} className={`w-5 h-5 ${active ? "" : "opacity-80"}`} />
                <span className="font-semibold leading-tight">{it.label}</span>
              </Link>
            );
          })}

    {/* Center Floating Action - GimPlay (feature-flagged, overlay) */}
      {gamiOn && (
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
            <Link
              href="/gamification"
        className={`pointer-events-auto grid place-items-center w-14 h-14 rounded-full shadow-lg border border-white/30 bg-gradient-to-b from-[#60a5fa] to-[#2563eb] ${
                pathname === "/gamification" ? "ring-4 ring-[#60a5fa]/30" : ""
              }`}
              aria-label="GimPlay"
            >
              <img src="/images/icon/gg--games.svg" alt="GimPlay" className="w-8 h-8 invert-[1] brightness-0 saturate-0" />
            </Link>
            <span
              className={`mt-1 text-[13px] font-semibold ${
                pathname === "/gamification" ? "text-[#0d6efd]" : "text-slate-900"
              }`}
            >
              GimPlay
            </span>
      </div>
      )}
        </div>
      </div>
    </nav>
  );
}
