"use client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <main className="w-full max-w-md">
          <div className="bg-[#fefefe] rounded-xl border shadow-sm p-6 text-slate-900">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-slate-900 text-slate-100">
          <AdminSidebar />
        </aside>
        <main className="flex-1">
          <div className="p-6">
            <div className="bg-[#fefefe] rounded-xl border shadow-sm p-6 text-slate-900">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
