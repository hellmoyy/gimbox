"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const items = [
  { href: "/", label: "Home", icon: "/images/icon/home.svg" },
  { href: "/promo", label: "Promo", icon: "/images/icon/discount.svg" },
  { href: "/transactions", label: "Transaksi", icon: "/images/icon/transaction.svg" },
  { href: "/account", label: "Akun", icon: "/images/icon/account.svg" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [initialVH, setInitialVH] = useState<number | null>(null);

  useEffect(() => {
    // iOS Safari: hide bottom nav when keyboard opens (focus on inputs/viewport height shrinks)
    const isFormEl = (el: any) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    const onFocusIn = (e: any) => { if (isFormEl(e.target)) setHidden(true); };
    const onFocusOut = () => { setTimeout(() => setHidden(false), 150); };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    // Visual viewport listener for keyboard appearance
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (initialVH == null) setInitialVH(window.innerHeight);
    const onVVResize = () => {
      const base = initialVH ?? window.innerHeight;
      const h = vv?.height ?? window.innerHeight;
      // If viewport height reduced significantly, assume keyboard open
      if (base - h > 120) setHidden(true);
      else setHidden(false);
    };
    if (vv) {
      vv.addEventListener("resize", onVVResize);
      vv.addEventListener("scroll", onVVResize);
    } else {
      window.addEventListener("resize", onVVResize);
    }

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      if (vv) {
        vv.removeEventListener("resize", onVVResize);
        vv.removeEventListener("scroll", onVVResize);
      } else {
        window.removeEventListener("resize", onVVResize);
      }
    };
  }, [initialVH]);

  const navCls = useMemo(() => `fixed inset-x-0 bottom-0 z-50 transition-transform duration-150 ${hidden ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`,[hidden]);

  return (
  <nav className={navCls} aria-hidden={hidden}>
    <div className="mx-auto w-full max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="bg-[#fefefe]/95 backdrop-blur rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between px-3 py-2 text-sm text-slate-700">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link key={it.href} href={it.href} className={`flex-1 flex flex-col items-center gap-0.5 py-1 ${active ? "text-[#0d6efd]" : "text-slate-700"}`}>
      <img src={it.icon} alt={it.label} className={`w-5 h-5 ${active ? '' : 'opacity-80'}`} />
              <span className="font-semibold leading-tight">{it.label}</span>
            </Link>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
