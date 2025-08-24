"use client";
import React from "react";

export default function LoadingOverlay({ label = "Memuat...", show = true, zIndex = 120, size = 72 }: { label?: string; show?: boolean; zIndex?: number; size?: number }) {
  if (!show) return null;
  const ringSize = size; // outer diameter
  const logoSize = Math.round(size * 0.5);
  const borderWidth = Math.max(3, Math.round(size * 0.055));
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex }}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <div className="absolute inset-0 rounded-full" style={{ border: `${borderWidth}px solid rgba(255,255,255,0.3)` }} />
          <div className="absolute inset-0 rounded-full animate-spin" style={{ border: `${borderWidth}px solid #0d6efd`, borderTopColor: 'transparent' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/logo128.png"
            alt="Loading"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain rounded"
            style={{ width: logoSize, height: logoSize }}
          />
        </div>
        {label && <div className="text-sm text-slate-200 drop-shadow-sm">{label}</div>}
      </div>
    </div>
  );
}
