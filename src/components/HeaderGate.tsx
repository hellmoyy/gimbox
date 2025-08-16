"use client";
import { usePathname } from "next/navigation";
import Header from "./Header";

export default function HeaderGate() {
  const pathname = usePathname();
  // Hide header on all admin routes
  if (pathname.startsWith("/admin")) return null;
  return <Header />;
}
