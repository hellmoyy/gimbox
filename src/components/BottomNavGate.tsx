"use client";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function BottomNavGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <BottomNav />;
}
