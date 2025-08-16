"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/products", label: "Produk", icon: "📦" },
  { href: "/admin/banners", label: "Banner", icon: "🖼️" },
  { href: "/admin/promos", label: "Promo", icon: "🏷️" },
  { href: "/admin/categories", label: "Kategori", icon: "🗂️" },
  { href: "/admin/transactions", label: "Transaksi", icon: "📑" },
  { href: "/admin/settings", label: "Pengaturan", icon: "⚙️" },
  { href: "/admin/provider", label: "Provider", icon: "🔌" },
  { href: "/admin/provider/vcgamers", label: "— Vcgamers", icon: "  " },
  { href: "/admin/provider/digiflazz", label: "— Digiflazz", icon: "  " },
  { href: "/admin/provider/iak", label: "— IAK", icon: "  " },
  { href: "/admin/payment-gateway", label: "Payment Gateway", icon: "💳" },
  { href: "/admin/payment-gateway/xendit", label: "— Xendit", icon: "  " },
  { href: "/admin/payment-gateway/midtrans", label: "— Midtrans", icon: "  " },
  { href: "/admin/payment-gateway/moota", label: "— Moota", icon: "  " },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center font-bold mr-2">A</div>
        <div className="font-semibold">Admin Panel</div>
      </div>
      <nav className="flex-1 p-2 text-sm">
        {nav.map((n) => {
          const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 px-3 py-2 rounded mb-1 hover:bg-slate-800 ${active ? "bg-slate-800" : "text-slate-300"}`}
            >
              <span className="w-4 text-center">{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-xs text-slate-400 border-t border-white/10">v0.1 • TokoSaya</div>
    </div>
  );
}
