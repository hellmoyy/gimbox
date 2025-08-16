"use client";
import { usePathname } from "next/navigation";
import BottomNavGate from "./BottomNavGate";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // For dashboard/admin, keep full desktop layout (no PWA/mobile container)
    return <>{children}</>;
  }

  // Public app shell with mobile-centered container and bottom nav
  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-md flex-1 flex flex-col md:rounded-2xl/3 backdrop-blur-sm bg-white/80 ring-1 ring-slate-200/60 shadow-sm">
        {children}
      </div>
      <BottomNavGate />
    </div>
  );
}
