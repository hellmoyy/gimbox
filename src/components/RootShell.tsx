"use client";
import { usePathname } from "next/navigation";
import BottomNavGate from "./BottomNavGate";
import ViewportUnitsFix from "./ViewportUnitsFix";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    // For dashboard/admin, keep full desktop layout (no PWA/mobile container)
    return <>{children}</>;
  }

  // Public app shell with mobile-centered container and bottom nav
  return (
    <div className="h-[calc(var(--app-vh,1vh)*100)] flex flex-col items-center bg-black pb-[env(safe-area-inset-bottom)]">
      <ViewportUnitsFix />
  {/* Reserve space for BottomNav height (~72px) + safe area to avoid overlap while scrolling */}
  <div className="w-full max-w-md flex-1 flex flex-col md:rounded-2xl/3 bg-[#f7f7f7] pb-[calc(5.5rem+env(safe-area-inset-bottom))] overscroll-contain touch-pan-y">
        {children}
      </div>
      <BottomNavGate />
    </div>
  );
}
