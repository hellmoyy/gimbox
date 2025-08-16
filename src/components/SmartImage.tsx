"use client";
import { useMemo, useState } from "react";

export default function SmartImage({ src, alt, className, loading = "lazy" }: { src: string; alt: string; className?: string; loading?: "lazy" | "eager" }) {
  const [idx, setIdx] = useState(0);
  const candidates = useMemo(() => {
    const s = (src || "").trim();
    if (!s) return ["/placeholder.png"];
    if (/(\.jpg|jpeg|png|webp)$/i.test(s)) {
      const base = s.replace(/\.(jpg|jpeg|png|webp)$/i, "");
      return [s, base + ".png", base + ".jpg", base + ".jpeg", base + ".webp"];
    }
    return [s + ".png", s + ".jpg", s + ".jpeg", s + ".webp"];
  }, [src]);

  const current = candidates[Math.min(idx, candidates.length - 1)];

  return (
    <img
      src={current}
      alt={alt}
  className={className}
  loading={loading}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
