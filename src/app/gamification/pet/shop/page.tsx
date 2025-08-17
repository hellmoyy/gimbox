"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: "premium01" | "premium02" | "premium03"; label: string; price: number };

const ITEMS: Item[] = [
  { id: "premium01", label: "Premium 01", price: 100 },
  { id: "premium02", label: "Premium 02", price: 100 },
  { id: "premium03", label: "Premium 03", price: 100 },
];

const PREMIUM_IDLE_DIR: Record<Item["id"], string> = {
  premium01: "/images/games/character_premium/Character 01/Png/Character Sprite/Idle",
  premium02: "/images/games/character_premium/Character 02/Png/Character Sprite/Idle",
  premium03: "/images/games/character_premium/Character 03/Png/Character Sprite/Idle",
};

function SpritePreview({ dir, prefix = "Character-Idle_", count = 20, pad = 2, ext = "png", className = "" }: { dir: string; prefix?: string; count?: number; pad?: number; ext?: string; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const rate = 1000 / 12; // 12 fps
    const t = setInterval(() => setI((v) => (v + 1) % count), rate);
    return () => clearInterval(t);
  }, [count]);
  const num = String(i).padStart(pad, "0");
  const src = `${dir}/${prefix}${num}.${ext}`;
  return (
  <img src={src} alt="preview" className={`h-24 w-auto object-contain select-none pointer-events-none scale-150 origin-center ${className}`} />
  );
}

// Driving preview uses the same sprite previewer with Driving animation
const DRIVING_PREFIX = "Character-Driving_";

type DriveItem = { id: string; label: string; dir: string; price: number };
const DRIVE_ITEMS: DriveItem[] = [
  // Existing characters (01..06)
  { id: "drive_char01", label: "Vehicle 1", dir: "/images/games/character/Character 01/Png/Character Sprite/Driving", price: 150 },
  { id: "drive_char02", label: "Driving Character 02", dir: "/images/games/character/Character 02/Png/Character Sprite/Driving", price: 150 },
  { id: "drive_char03", label: "Driving Character 03", dir: "/images/games/character/Character 03/Png/Character Sprite/Driving", price: 150 },
  { id: "drive_char04", label: "Driving Character 04", dir: "/images/games/character/Character 04/Png/Character Sprite/Driving", price: 150 },
  { id: "drive_char05", label: "Driving Character 05", dir: "/images/games/character/Character 05/Png/Character Sprite/Driving", price: 150 },
  { id: "drive_char06", label: "Driving Character 06", dir: "/images/games/character/Character 06/Png/Character Sprite/Driving", price: 150 },
  // Premium characters (01..03)
  { id: "drive_premium01", label: "Vehicle Premium 1", dir: "/images/games/character_premium/Character 01/Png/Character Sprite/Driving", price: 200 },
  { id: "drive_premium02", label: "Driving Premium 02", dir: "/images/games/character_premium/Character 02/Png/Character Sprite/Driving", price: 200 },
  { id: "drive_premium03", label: "Driving Premium 03", dir: "/images/games/character_premium/Character 03/Png/Character Sprite/Driving", price: 200 },
];

export default function PetShopPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<number>(0);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [ownedVehicles, setOwnedVehicles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeAppearance, setActiveAppearance] = useState<"char01"|"char02"|"char03"|"char04"|"char05"|"char06"|"premium01"|"premium02"|"premium03"|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, tr] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/pet", { cache: "no-store" }),
        ]);
        if (!pr.ok || !tr.ok) {
          // Not logged in
          if (alive) setLoading(false);
          return;
        }
  const pj = await pr.json();
        const tj = await tr.json();
        const oc = new Set<string>(pj?.profile?.ownedCharacters || []);
        const ov = new Set<string>(pj?.profile?.ownedVehicles || []);
        if (alive) {
          setOwned(oc);
          setOwnedVehicles(ov);
          setCoins(Number(tj?.pet?.coins || 0));
          setLoading(false);
        }
        // Determine active appearance from localStorage
        try {
          const savedApp = typeof window !== "undefined" ? (localStorage.getItem("gimplay_appearance") as string | null) : null;
          const allowed = new Set(["char01","char02","char03","char04","char05","char06","premium01","premium02","premium03"]);
          if (savedApp && allowed.has(savedApp)) {
            setActiveAppearance(savedApp as any);
          } else {
            setActiveAppearance("char01");
          }
        } catch {
          setActiveAppearance("char01");
        }
      } catch {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function buy(id: Item["id"], price: number) {
    setBusy(id);
    try {
      const res = await fetch("/api/characters/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: id, price }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Gagal membeli");
      } else {
        alert("Berhasil membeli karakter");
        // refresh coins and owned
        try {
          const [pr, tr] = await Promise.all([
            fetch("/api/profile", { cache: "no-store" }),
            fetch("/api/pet", { cache: "no-store" }),
          ]);
          const pj = await pr.json();
          const tj = await tr.json();
          setOwned(new Set<string>(pj?.profile?.ownedCharacters || []));
          setOwnedVehicles(new Set<string>(pj?.profile?.ownedVehicles || []));
          setCoins(Number(tj?.pet?.coins || 0));
        } catch {}
      }
    } catch (e: any) {
      alert(e?.message || "Gagal membeli");
    } finally {
      setBusy(null);
    }
  }

  function useCharacter(id: Item["id"]) {
    try {
      localStorage.setItem("gimplay_appearance", id);
    } catch {}
    router.push("/gamification/pet");
  }

  async function buyVehicle(id: DriveItem["id"], price: number) {
    setBusy(id);
    try {
      const res = await fetch("/api/vehicles/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle: id, price }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Gagal membeli");
      } else {
        alert("Berhasil membeli vehicle");
        try {
          const [pr, tr] = await Promise.all([
            fetch("/api/profile", { cache: "no-store" }),
            fetch("/api/pet", { cache: "no-store" }),
          ]);
          const pj = await pr.json();
          const tj = await tr.json();
          setOwnedVehicles(new Set<string>(pj?.profile?.ownedVehicles || []));
          setCoins(Number(tj?.pet?.coins || 0));
        } catch {}
      }
    } catch (e: any) {
      alert(e?.message || "Gagal membeli");
    } finally {
      setBusy(null);
    }
  }

  function useVehicle(id: DriveItem["id"]) {
    try {
      localStorage.setItem("gimplay_vehicle", id);
    } catch {}
    router.push("/gamification/pet");
  }


  return (
    <main className="min-h-screen pb-28">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Shop</h1>
          <a href="/gamification/pet" className="text-sm text-blue-600 font-semibold">← Kembali</a>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-slate-600">Beli karakter premium menggunakan koin.</p>
          <div className="text-sm font-semibold text-slate-900">🪙 {coins}</div>
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-3 gap-2 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-2 text-center border-slate-200">
                <div className="h-24 rounded bg-slate-100" />
                <div className="mt-1 h-3 rounded bg-slate-100" />
                <div className="mt-1 h-7 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {ITEMS.map((it) => {
              const isOwned = owned.has(it.id);
              return (
                <div key={it.id} className="rounded-xl border p-2 text-center border-slate-200 bg-white">
                  <div className="h-24 overflow-hidden flex items-center justify-center">
                    <SpritePreview dir={PREMIUM_IDLE_DIR[it.id]} />
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-800">{it.label}</div>
                  {isOwned ? (
                    <button
                      onClick={() => useCharacter(it.id)}
                      className="mt-1 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Use
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(it.id, it.price)}
                      disabled={busy === it.id}
                      className="mt-1 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {busy === it.id ? "Buying..." : `${it.price} Point`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Vehicles - Driving versions (active character + unowned premium) */}
        <h2 className="mt-6 text-sm font-semibold text-slate-900">Vehicles (Driving)</h2>
        {loading ? (
          <div className="mt-2 grid grid-cols-3 gap-2 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-2 text-center border-slate-200">
                <div className="h-24 rounded bg-slate-100" />
                <div className="mt-1 h-3 rounded bg-slate-100" />
                <div className="mt-1 h-7 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(() => {
              // Build filtered list
              const items: DriveItem[] = [];
              // Active character driving
              if (activeAppearance) {
                const mapActive = (app: string): string | null => {
                  if (app.startsWith("char")) return `drive_${app}`; // e.g., char01 -> drive_char01
                  if (app.startsWith("premium")) return `drive_${app}`; // premium01 -> drive_premium01
                  return null;
                };
                const activeId = mapActive(activeAppearance);
                if (activeId) {
                  const found = DRIVE_ITEMS.find((d) => d.id === activeId);
                  if (found) items.push(found);
                }
              }
              // Unowned premium driving vehicles
              DRIVE_ITEMS.forEach((d) => {
                if (d.id.startsWith("drive_premium") && !ownedVehicles.has(d.id)) {
                  if (!items.find((x) => x.id === d.id)) items.push(d);
                }
              });
              return items.map((it) => {
              const isOwned = ownedVehicles.has(it.id);
              return (
                <div key={it.id} className="rounded-xl border p-2 text-center border-slate-200 bg-white">
                  <div className="h-24 overflow-hidden flex items-center justify-center">
                    <SpritePreview
                      dir={it.dir}
                      prefix={DRIVING_PREFIX}
                      count={20}
                      pad={2}
                      ext="png"
                      className="scale-[0.98]"
                    />
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-800">{it.label}</div>
                  {isOwned ? (
                    <button
                      onClick={() => useVehicle(it.id)}
                      className="mt-1 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Use
                    </button>
                  ) : (
                    <button
                      onClick={() => buyVehicle(it.id, it.price)}
                      disabled={busy === it.id}
                      className="mt-1 w-full text-xs font-semibold px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {busy === it.id ? "Buying..." : `${it.price} Point`}
                    </button>
                  )}
                </div>
              );
            });
            })()}
          </div>
        )}
      </div>
    </main>
  );
}
