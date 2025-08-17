"use client";
import { useEffect } from "react";

/**
 * Sets --app-vh to window.innerHeight * 0.01 to stabilize viewport units on iOS Safari
 * Updates on resize, orientationchange, and visualViewport changes.
 */
export default function ViewportUnitsFix() {
  useEffect(() => {
  const set = () => {
      try {
    // Prefer visualViewport for iOS Chrome/Safari to account for URL bar and keyboard
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const visibleHeight = vv ? (vv.height - (vv.offsetTop ?? 0)) : window.innerHeight;
    const vh = visibleHeight * 0.01;
    document.documentElement.style.setProperty("--app-vh", `${vh}px`);
      } catch {}
    };
    set();
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  window.addEventListener("resize", set, { passive: true });
  window.addEventListener("orientationchange", set, { passive: true });
  vv?.addEventListener("resize", set, { passive: true } as any);
  vv?.addEventListener("scroll", set, { passive: true } as any);
    return () => {
    window.removeEventListener("resize", set as any);
    window.removeEventListener("orientationchange", set as any);
    vv?.removeEventListener("resize", set as any);
    vv?.removeEventListener("scroll", set as any);
    };
  }, []);
  return null;
}
