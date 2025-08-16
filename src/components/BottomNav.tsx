"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "/images/icon/home.svg" },
  { href: "/promo", label: "Promo", icon: "/images/icon/discount.svg" },
  { href: "/transactions", label: "Transaksi", icon: "/images/icon/transaction.svg" },
  { href: "/account", label: "Akun", icon: "/images/icon/account.svg" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
  <nav className="fixed inset-x-0 bottom-0 z-50">
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
