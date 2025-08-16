import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
