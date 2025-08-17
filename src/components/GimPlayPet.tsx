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

export default function GimPlayPet() {
  // Render a stable default for SSR, then hydrate client state after mount
  const [pet, setPet] = useState<Pet>({
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
    updatedAt: 0,
  });
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const tickRef = useRef<number | null>(null);

  // Derive level-up threshold
  const expToLevel = useMemo(() => pet.level * 100, [pet.level]);

  // Load from storage and apply time drift only after mount
  useEffect(() => {
    const base = loadPet();
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
        <div className="text-sm font-semibold text-slate-900">🪙 {pet.coins}</div>
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
              animation={{
                idle: {
                  dir: "/images/games/character/Character 01/Png/Character Sprite/Idle",
                  prefix: "Character-Idle_",
                  count: 20,
                  pad: 2,
                  ext: "png",
                },
                run: {
                  dir: "/images/games/character/Character 01/Png/Character Sprite/Run",
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
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">PvP soon</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={practiceBattle}
            disabled={pet.sleeping}
            className="relative overflow-hidden flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl active:scale-[0.99] transition disabled:opacity-60"
          >
            <span className="text-base leading-none">⚔️</span>
            <span>Fight (Practice)</span>
            <span className="ml-auto text-[10px] rounded-full bg-white/20 px-2 py-0.5">-15 energy</span>
          </button>
          <button
            disabled
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-white text-slate-700 text-sm font-semibold border border-slate-200 shadow hover:bg-slate-50 disabled:opacity-60"
            title="Coming soon"
          >
            <span className="text-base leading-none">🧑‍🤝‍🧑</span>
            <span>PvP</span>
            <span className="ml-auto text-[10px] rounded-full bg-slate-100 px-2 py-0.5">soon</span>
          </button>
        </div>
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
