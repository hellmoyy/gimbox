"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Character from "./GimPlayCharacter";

type Pet = {
  name: string;
  level: number;
  exp: number;
  coins: number;
  hp: number; // 0..100
  hunger: number; // 0..100
  energy: number; // 0..100
  mood: number; // 0..100
  sleeping: boolean;
  inventory: { food: number };
  updatedAt: number; // ms
};

const STORAGE_KEY = "gimplay_pet_v1";

function loadPet(): Pet {
  if (typeof window === "undefined")
    return {
      name: "GimPet",
      level: 1,
      exp: 0,
      coins: 0,
      hp: 100,
      hunger: 80,
      energy: 80,
      mood: 60,
      sleeping: false,
      inventory: { food: 3 },
      updatedAt: Date.now(),
    };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Pet;
  } catch {}
  return {
    name: "GimPet",
    level: 1,
    exp: 0,
    coins: 0,
    hp: 100,
    hunger: 80,
    energy: 80,
    mood: 60,
    sleeping: false,
    inventory: { food: 3 },
    updatedAt: Date.now(),
  };
}

function savePet(p: Pet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export default function GimPlayPet({ selectedCharacter = "char01" as "char01"|"char02"|"char03"|"char04"|"char05"|"char06", initialName }: { selectedCharacter?: "char01"|"char02"|"char03"|"char04"|"char05"|"char06"; initialName?: string }) {
  // Render a stable default for SSR, then hydrate client state after mount
  const [pet, setPet] = useState<Pet>({
  name: initialName || "GimPet",
    level: 1,
    exp: 0,
    coins: 0,
    hp: 100,
    hunger: 80,
    energy: 80,
    mood: 60,
    sleeping: false,
    inventory: { food: 3 },
    updatedAt: 0,
  });
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const tickRef = useRef<number | null>(null);
  const [appearance, setAppearance] = useState<"char01"|"char02"|"char03"|"char04"|"char05"|"char06"|"premium01"|"premium02"|"premium03">(selectedCharacter);
  const [owned, setOwned] = useState<Set<string>>(new Set([selectedCharacter]));
  const [ownedVehicles, setOwnedVehicles] = useState<Set<string>>(new Set());
  const [vehicle, setVehicle] = useState<"vehicle01"|"vehicle02"|"vehicle03"|null>(null);

  // Derive level-up threshold
  const expToLevel = useMemo(() => pet.level * 100, [pet.level]);

  // Load from storage and apply time drift only after mount
  useEffect(() => {
    const base = loadPet();
    if (initialName && initialName.trim().length >= 6 && base.name === "GimPet") {
      base.name = initialName.trim();
    }
  // Do not set saved appearance yet; we'll validate ownership after fetching profile below
    const now = Date.now();
    const dtSec = Math.max(0, Math.floor((now - base.updatedAt) / 1000));
    let next = { ...base, updatedAt: now };
    if (dtSec > 0) {
      next.hunger = clamp(next.hunger - dtSec * 0.02);
      next.mood = clamp(next.mood - dtSec * 0.015);
      if (next.sleeping) {
        next.energy = clamp(next.energy + dtSec * 0.1);
        next.hp = clamp(next.hp + dtSec * 0.05);
      } else {
        next.energy = clamp(next.energy - dtSec * 0.03);
      }
      if (next.hunger <= 5) next.hp = clamp(next.hp - dtSec * 0.08);
    }
    setPet(next);
    setReady(true);

    // Fetch server state and merge
    (async () => {
      try {
        // Load owned characters, then apply saved appearance if owned
        try {
          const pr = await fetch("/api/profile", { cache: "no-store" });
          const pj = await pr.json();
          const ownedCharacters: string[] = pj?.profile?.ownedCharacters || [];
          const ownedVeh: string[] = pj?.profile?.ownedVehicles || [];
          const set = new Set<string>(ownedCharacters);
          set.add(selectedCharacter);
          setOwned(set);
          setOwnedVehicles(new Set<string>(ownedVeh));
          const savedApp = typeof window !== "undefined" ? (localStorage.getItem("gimplay_appearance") as string | null) : null;
          const all = new Set(["char01","char02","char03","char04","char05","char06","premium01","premium02","premium03"]);
          if (savedApp && all.has(savedApp) && set.has(savedApp)) {
            setAppearance(savedApp as any);
          } else if (savedApp && !set.has(savedApp)) {
            // Clean up invalid saved appearance
            try { localStorage.removeItem("gimplay_appearance"); } catch {}
          }
          const savedVeh = typeof window !== "undefined" ? (localStorage.getItem("gimplay_vehicle") as string | null) : null;
          const vehAll = new Set(["vehicle01","vehicle02","vehicle03"]);
          if (savedVeh && vehAll.has(savedVeh) && (new Set<string>(ownedVeh)).has(savedVeh)) {
            setVehicle(savedVeh as any);
          } else if (savedVeh && !(new Set<string>(ownedVeh)).has(savedVeh)) {
            try { localStorage.removeItem("gimplay_vehicle"); } catch {}
          }
        } catch {}
        const res = await fetch("/api/pet", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          const s = j?.pet as any;
          if (s) {
            const merged: Pet = {
              name: typeof s.name === "string" ? s.name : next.name,
              level: typeof s.level === "number" ? s.level : next.level,
              exp: typeof s.exp === "number" ? s.exp : next.exp,
              coins: typeof s.coins === "number" ? s.coins : next.coins,
              hp: typeof s.hp === "number" ? s.hp : next.hp,
              hunger: typeof s.hunger === "number" ? s.hunger : next.hunger,
              energy: typeof s.energy === "number" ? s.energy : next.energy,
              mood: typeof s.mood === "number" ? s.mood : next.mood,
              sleeping: typeof s.sleeping === "boolean" ? s.sleeping : next.sleeping,
              inventory: s?.inventory && typeof s.inventory.food === "number" ? { food: s.inventory.food } : next.inventory,
              updatedAt: Date.now(),
            };
            setPet(merged);
            savePet(merged);
          }
        }
      } catch {}
    })();

    tickRef.current = window.setInterval(() => {
      setPet((p) => {
        const now2 = Date.now();
        let n = { ...p, updatedAt: now2 };
        n.hunger = clamp(n.hunger - 0.02);
        n.mood = clamp(n.mood - 0.015);
        if (n.sleeping) {
          n.energy = clamp(n.energy + 0.1);
          n.hp = clamp(n.hp + 0.05);
        } else {
          n.energy = clamp(n.energy - 0.03);
        }
        if (n.hunger <= 5) n.hp = clamp(n.hp - 0.08);
        savePet(n);
        return n;
      });
    }, 1000) as unknown as number;

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Debounced persist to server when pet changes
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        await fetch("/api/pet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pet }),
          signal: ctrl.signal,
        });
      } catch {}
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [pet, ready]);

  function pushLog(msg: string) {
    setLog((l) => [msg, ...l.slice(0, 9)]);
  }

  // Actions
  function feed() {
    setPet((p) => {
      if (p.inventory.food <= 0) {
        pushLog("Makanan habis");
        return p;
      }
      const next = {
        ...p,
        hunger: clamp(p.hunger + 25),
        mood: clamp(p.mood + 5),
        inventory: { ...p.inventory, food: p.inventory.food - 1 },
      };
      pushLog("Nyam! +25 hunger");
      return next;
    });
  }

  function play() {
    setPet((p) => {
      if (p.energy < 10) {
        pushLog("Energi kurang");
        return p;
      }
      const next = {
        ...p,
        energy: clamp(p.energy - 10),
        mood: clamp(p.mood + 12),
        exp: p.exp + 15,
      };
      pushLog("Seru! +12 mood, +15 exp");
      return maybeLevelUp(next);
    });
  }

  function sleepToggle() {
    setPet((p) => {
      const next = { ...p, sleeping: !p.sleeping };
      pushLog(next.sleeping ? "Tidur..." : "Bangun!");
      return next;
    });
  }

  function buyFood() {
    setPet((p) => {
      if (p.coins < 10) {
        pushLog("Koin tidak cukup");
        return p;
      }
      const next = { ...p, coins: p.coins - 10, inventory: { food: p.inventory.food + 1 } };
      pushLog("Beli 1 makanan (-10 coin)");
      return next;
    });
  }

  function maybeLevelUp(p: Pet): Pet {
    let cur = { ...p };
    while (cur.exp >= cur.level * 100) {
      cur.exp -= cur.level * 100;
      cur.level += 1;
      cur.hp = clamp(cur.hp + 10);
      pushLog(`Naik level ${cur.level}!`);
    }
    return cur;
  }

  function practiceBattle() {
    // Simple turn-based vs dummy
    setPet((p) => {
      if (p.energy < 15) {
        pushLog("Energi tidak cukup untuk battle");
        return p;
      }
      let playerHP = 30 + p.level * 5;
      let enemyHP = 25 + p.level * 4;
      let coinsWon = 0;
      let turns = 0;
      while (playerHP > 0 && enemyHP > 0 && turns < 20) {
        turns++;
        const pDmg = Math.floor(4 + Math.random() * (6 + p.level));
        const eDmg = Math.floor(3 + Math.random() * (5 + p.level));
        enemyHP -= pDmg;
        if (enemyHP <= 0) break;
        playerHP -= eDmg;
      }
      const win = playerHP > 0 && enemyHP <= 0;
      coinsWon = win ? 15 + Math.floor(Math.random() * 10) : 5;
      pushLog(win ? `Menang! +${coinsWon} coin, +20 exp` : `Kalah. +${coinsWon} coin, +10 exp`);
      const next = {
        ...p,
        coins: p.coins + coinsWon,
        exp: p.exp + (win ? 20 : 10),
        energy: clamp(p.energy - 15),
        mood: clamp(p.mood + (win ? 8 : 2)),
      };
      return maybeLevelUp(next);
    });
  }

  // Avoid rendering unstable numbers before ready to prevent hydration mismatch
  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-[#fefefe] p-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-40 rounded-xl bg-slate-100 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded" />
          <div className="h-3 bg-slate-200 rounded" />
          <div className="h-3 bg-slate-200 rounded" />
          <div className="h-3 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-slate-900">{pet.name}</div>
          <div className="text-sm text-slate-600">Lv {pet.level} • Exp {pet.exp}/{expToLevel}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">🪙 {pet.coins}</div>
          <a
            href="/gamification/pet/shop"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow hover:shadow-md active:scale-[0.99] transition"
          >
            Shop
          </a>
        </div>
      </div>

      {/* Character with movement */}
      <div className="relative mb-3">
        <div className="absolute right-3 top-3 z-10 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
          {pet.sleeping ? "Sleeping" : pet.mood > 70 ? "Happy" : pet.hunger < 30 ? "Hungry" : "Normal"}
        </div>
            <Character
              width={180}
              height={180}
              speed={3}
              vehicle={vehicle ? {
                src: vehicle === "vehicle01" ? "/images/games/vehicle/Flying Car 1/Flying-car.png" : vehicle === "vehicle02" ? "/images/games/vehicle/Flying Car 2/Flying-car.png" : "/images/games/vehicle/Flying Car 3/Flying-car.png",
                width: 220,
                offsetX: -8,
                offsetY: 6,
                flipWithDir: true,
              } : undefined}
              animation={{
                idle: {
                  dir:
                    appearance === "char02"
                      ? "/images/games/character/Character 02/Png/Character Sprite/Idle"
                      : appearance === "char03"
                        ? "/images/games/character/Character 03/Png/Character Sprite/Idle"
                        : appearance === "char04"
                          ? "/images/games/character/Character 04/Png/Character Sprite/Idle"
                          : appearance === "char05"
                            ? "/images/games/character/Character 05/Png/Character Sprite/Idle"
                            : appearance === "char06"
                              ? "/images/games/character/Character 06/Png/Character Sprite/Idle"
                              : appearance === "premium01"
                                ? "/images/games/character_premium/Character 01/Png/Character Sprite/Idle"
                                : appearance === "premium02"
                                  ? "/images/games/character_premium/Character 02/Png/Character Sprite/Idle"
                                  : appearance === "premium03"
                                    ? "/images/games/character_premium/Character 03/Png/Character Sprite/Idle"
                              : "/images/games/character/Character 01/Png/Character Sprite/Idle",
                  prefix: "Character-Idle_",
                  count: 20,
                  pad: 2,
                  ext: "png",
                },
                run: {
                  dir:
                    appearance === "char02"
                      ? "/images/games/character/Character 02/Png/Character Sprite/Run"
                      : appearance === "char03"
                        ? "/images/games/character/Character 03/Png/Character Sprite/Run"
                        : appearance === "char04"
                          ? "/images/games/character/Character 04/Png/Character Sprite/Run"
                          : appearance === "char05"
                            ? "/images/games/character/Character 05/Png/Character Sprite/Run"
                            : appearance === "char06"
                              ? "/images/games/character/Character 06/Png/Character Sprite/Run"
                              : appearance === "premium01"
                                ? "/images/games/character_premium/Character 01/Png/Character Sprite/Run"
                                : appearance === "premium02"
                                  ? "/images/games/character_premium/Character 02/Png/Character Sprite/Run"
                                  : appearance === "premium03"
                                    ? "/images/games/character_premium/Character 03/Png/Character Sprite/Run"
                              : "/images/games/character/Character 01/Png/Character Sprite/Run",
                  prefix: "Character-Run_",
                  count: 30,
                  pad: 2,
                  ext: "png",
                },
                frameRate: 12,
              }}
            />
      </div>

      {/* Stats */}
  <div className="grid grid-cols-2 gap-1">
        <StatCard label="HP" icon="❤️" value={pet.hp} tone="hp" />
        <StatCard label="Hunger" icon="🍗" value={pet.hunger} tone="hunger" />
  <StatCard label="Energy" icon="⚡" value={pet.energy} tone="energy" />
        <StatCard label="Mood" icon="🙂" value={pet.mood} tone="mood" />
      </div>

      {/* Actions - compact dock */}
      <div className="mt-3">
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-2 py-2">
          <div className="grid grid-cols-4 gap-1">
            {/* Feed */}
            <button
              onClick={feed}
              disabled={pet.sleeping}
              className="relative group flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="text-base leading-none select-none">🍗</span>
              <span className="text-[10px] font-medium text-slate-800">Feed</span>
              <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{pet.inventory.food}</span>
            </button>

            {/* Play */}
            <button
              onClick={play}
              disabled={pet.sleeping}
              className="group flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="text-base leading-none select-none">🎮</span>
              <span className="text-[10px] font-medium text-slate-800">Play</span>
            </button>

            {/* Sleep/Wake */}
            <button
              onClick={sleepToggle}
              className="group flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <span className="text-base leading-none select-none">{pet.sleeping ? "🌞" : "🌙"}</span>
              <span className="text-[10px] font-medium text-slate-800">{pet.sleeping ? "Wake" : "Sleep"}</span>
            </button>

            {/* Buy Food */}
            <button
              onClick={buyFood}
              className="group flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <span className="text-base leading-none select-none">🛒</span>
              <span className="text-[10px] font-medium text-slate-800">Buy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Battle */}
      <div className="mt-4 rounded-2xl border border-slate-200 p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-slate-900">Battle</div>
        </div>
        <button
          onClick={() => alert("Coming soon")}
          disabled={pet.sleeping}
          className="relative overflow-hidden w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-base font-bold shadow-xl hover:shadow-2xl active:scale-[0.99] transition disabled:opacity-60"
        >
          <span className="text-xl leading-none">⚔️</span>
          <span className="flex flex-col leading-tight text-left">
            <span>Fight</span>
            <span className="text-[11px] font-normal text-white/85">Main dengan user lain</span>
          </span>
          <span className="ml-auto text-[11px] rounded-full bg-white/20 px-2 py-0.5">- 15 Point</span>
        </button>
  <p className="mt-2 text-center text-[11px] text-slate-600">Main,Menang dan dapatkan Point dari Lawan</p>
      </div>

  {/* Logs panel removed as requested */}
    </div>
  );
}

type Tone = "hp" | "hunger" | "energy" | "mood";

function gradientFor(tone: Tone, value: number) {
  if (value < 25) return "from-rose-400 via-rose-500 to-rose-600";
  if (value < 60) return "from-amber-400 via-amber-500 to-amber-600";
  const high: Record<Tone, string> = {
    hp: "from-emerald-400 via-emerald-500 to-emerald-600",
    hunger: "from-amber-400 via-amber-500 to-amber-600",
    energy: "from-sky-400 via-sky-500 to-sky-600",
    mood: "from-pink-400 via-pink-500 to-fuchsia-600",
  };
  return high[tone];
}

function statusChip(value: number) {
  if (value < 25) return { text: "Low", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (value < 60) return { text: "Okay", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { text: "Good", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

function StatCard({ label, icon, value, tone }: { label: string; icon: string; value: number; tone: Tone }) {
  const v = clamp(value);
  const grad = gradientFor(tone, v);
  const chip = statusChip(v);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-1.5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-700">
          <span className="text-[12px] leading-none select-none">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-900">{Math.round(v)}%</span>
          <span className={`text-[8px] px-1 py-0 rounded-full border ${chip.cls}`}>{chip.text}</span>
        </div>
      </div>
      <div className="relative h-1 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${grad}`} style={{ width: `${v}%` }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0, rgba(255,255,255,0.35) 1px, transparent 1px, transparent 8px)",
          }}
        />
      </div>
    </div>
  );
}
