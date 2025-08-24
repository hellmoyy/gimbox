"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const iconCls = "w-4 h-4";
const icons = {
  home: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10.5V20h13v-9.5" strokeLinecap="round" />
    </svg>
  ),
  box: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7l9 4 9-4-9-4-9 4Z" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" strokeLinejoin="round" />
      <path d="M12 11v10" />
    </svg>
  ),
  image: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 13l2.5-2.5L14 14l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="1.2" />
    </svg>
  ),
  tag: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12l9 9 9-9-9-9H7a4 4 0 0 0-4 4v4Z" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.5" />
    </svg>
  ),
  grid: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  receipt: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeLinejoin="round" />
      <path d="M8.5 8.5h7" strokeLinecap="round" />
      <path d="M8.5 12h7" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
      <path d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.2-2-3.4-2.2.5a7.6 7.6 0 0 0-1.7-1l-.3-2.2h-4l-.3 2.2c-.6.3-1.1.6-1.7 1l-2.2-.5-2 3.4 2 1.2a7.9 7.9 0 0 0 0 2l-2 1.2 2 3.4 2.2-.5c.5.4 1.1.7 1.7 1l.3 2.2h4l.3-2.2c.6-.3 1.1-.6 1.7-1l2.2.5 2-3.4-2-1.2Z" />
    </svg>
  ),
  plug: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 8V4M17 8V4" strokeLinecap="round" />
      <path d="M6 8h12v4a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6V8Z" />
    </svg>
  ),
  card: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
    </svg>
  ),
  user: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M4.5 19a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  ),
  dot: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3" /></svg>
  ),
  chevron: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  power: (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v8" strokeLinecap="round" />
      <path d="M6.8 6.8a7 7 0 1 0 9.9 0" strokeLinecap="round" />
    </svg>
  ),
};

type NavItem = { href: string; label: string; icon: React.ReactNode; children?: Array<{ href: string; label: string; icon?: React.ReactNode }> };

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: icons.home },
  { href: "/admin/products", label: "Produk", icon: icons.box },
  { href: "/admin/banners", label: "Banner", icon: icons.image },
  { href: "/admin/promos", label: "Promo", icon: icons.tag },
  { href: "/admin/categories", label: "Kategori", icon: icons.grid },
  {
    href: "/admin/transactions",
    label: "Transaksi",
    icon: icons.receipt,
    children: [
      { href: "/admin/transactions", label: "Transaksi Pembelian", icon: icons.dot },
      { href: "/admin/transactions/gimcash", label: "Transaksi Gimcash", icon: icons.dot },
    ],
  },
  {
    href: "/admin/provider",
    label: "Provider",
    icon: icons.plug,
    children: [
      { href: "/admin/provider", label: "Overview", icon: icons.dot },
      { href: "/admin/provider/vcgamers", label: "Vcgamers", icon: icons.dot },
      { href: "/admin/provider/digiflazz", label: "Digiflazz", icon: icons.dot },
      { href: "/admin/provider/iak", label: "IAK", icon: icons.dot },
    ],
  },
  {
    href: "/admin/payment-gateway",
    label: "Payment Gateway",
    icon: icons.card,
    children: [
      { href: "/admin/payment-gateway", label: "Overview", icon: icons.dot },
  { href: "/admin/payment-gateway/xendit", label: "Xendit", icon: icons.dot },
  { href: "/admin/payment-gateway/midtrans", label: "Midtrans", icon: icons.dot },
  { href: "/admin/payment-gateway/moota", label: "Moota", icon: icons.dot },
  { href: "/admin/payment-gateway/duitku", label: "Duitku", icon: icons.dot },
  { href: "/admin/webhook-logs", label: "Webhook Logs", icon: icons.dot },
    ],
  },
  { href: "/admin/users", label: "Users", icon: icons.user },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [providerOpen, setProviderOpen] = useState(pathname.startsWith("/admin/provider"));
  const [paymentOpen, setPaymentOpen] = useState(pathname.startsWith("/admin/payment-gateway"));
  const [txOpen, setTxOpen] = useState(pathname.startsWith("/admin/transactions"));

  const expandedByHref = useMemo(() => ({
    "/admin/provider": providerOpen,
    "/admin/payment-gateway": paymentOpen,
    "/admin/transactions": txOpen,
  }), [providerOpen, paymentOpen, txOpen]);
  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-indigo-500/90 flex items-center justify-center font-bold mr-2">A</div>
        <div className="font-semibold tracking-wide">Admin Panel</div>
      </div>
      <nav className="flex-1 p-2 text-sm overflow-y-auto">
        {nav.map((n) => {
          const hasChildren = Array.isArray(n.children) && n.children.length > 0;
          const active = pathname === n.href || (!hasChildren && n.href !== "/admin" && pathname.startsWith(n.href));
          if (!hasChildren) {
            return (
              <Link key={n.href} href={n.href} className={`group flex items-center gap-2 px-3 py-2 rounded mb-1 hover:bg-slate-800/50 ${active ? "bg-slate-800/70 text-white" : "text-slate-300"}`}>
                <span className={`shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>{n.icon}</span>
                <span className="truncate">{n.label}</span>
                {active && <span className="ml-auto h-4 w-1 rounded-full bg-indigo-400" />}
              </Link>
            );
          }

          const expanded = expandedByHref[n.href as keyof typeof expandedByHref] ?? false;
          const setExpanded = n.href === "/admin/provider" ? setProviderOpen : n.href === "/admin/payment-gateway" ? setPaymentOpen : setTxOpen;
          const sectionActive = pathname.startsWith(n.href);
          return (
            <div key={n.href} className="mb-1">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800/50 ${sectionActive ? "bg-slate-800/70 text-white" : "text-slate-300"}`}
              >
                <span className={`shrink-0 ${sectionActive ? "text-white" : "text-slate-400"}`}>{n.icon}</span>
                <span className="flex-1 text-left truncate">{n.label}</span>
                <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>{icons.chevron}</span>
              </button>
              {expanded && (
                <div className="mt-1 pl-4">
                  {n.children!.map((c) => {
                    const childActive = pathname === c.href;
                    return (
                      <Link key={c.href} href={c.href} className={`group flex items-center gap-2 px-3 py-2 rounded mb-1 hover:bg-slate-800/50 ${childActive ? "bg-slate-800/70 text-white" : "text-slate-400"}`}>
                        <span className={`shrink-0 ${childActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>{c.icon || icons.dot}</span>
                        <span className="truncate">{c.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={async () => {
            try {
              await fetch("/api/admin/logout", { method: "POST" });
            } catch {}
            router.push("/admin/login");
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm bg-slate-800/70 hover:bg-slate-800 text-slate-100"
        >
          <span className="text-slate-300">{icons.power}</span>
          <span>Logout</span>
        </button>
        <Link
          href="/admin/settings"
          className={`group flex items-center gap-2 px-3 py-2 rounded mt-2 hover:bg-slate-800/50 text-slate-300`}
        >
          <span className="shrink-0 text-slate-400 group-hover:text-slate-200">{icons.settings}</span>
          <span className="truncate">Pengaturan</span>
        </Link>
        <div className="mt-2 text-[11px] text-slate-400">v0.1 • TokoSaya</div>
      </div>
    </div>
  );
}
