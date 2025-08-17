"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Spawn = { x: number; y: number };

export default function GimPlayAim() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem("gimplay_best") || "0");
    return Number.isFinite(v) ? v : 0;
  });
  const [spawn, setSpawn] = useState<Spawn | null>(null);

  const targetSize = 48; // px

  const randomSpawn = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const maxX = rect.width - targetSize - pad;
    const maxY = rect.height - targetSize - pad;
    const x = Math.max(pad, Math.floor(Math.random() * (maxX - pad)));
    const y = Math.max(pad, Math.floor(Math.random() * (maxY - pad)));
    setSpawn({ x, y });
  }, []);

  const reset = useCallback(() => {
    setStarted(false);
    setTimeLeft(30);
    setScore(0);
    setSpawn(null);
  }, []);

  const start = useCallback(() => {
    setStarted(true);
    setTimeLeft(30);
    setScore(0);
    requestAnimationFrame(randomSpawn);
  }, [randomSpawn]);

  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      setStarted(false);
      setSpawn(null);
      setBest((prev) => {
        const next = Math.max(prev, score);
        try {
          localStorage.setItem("gimplay_best", String(next));
        } catch {}
        return next;
      });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, score]);

  const onBoardClick = useCallback(() => {
    if (!started) return;
    // Optional: miss penalty
    setScore((s) => (s > 0 ? s - 1 : 0));
  }, [started]);

  const hit = useCallback(() => {
    if (!started) return;
    setScore((s) => s + 1);
    randomSpawn();
  }, [started, randomSpawn]);

  const statusColor = useMemo(() => (started ? "text-emerald-600" : "text-slate-500"), [started]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Aim Trainer (30s)</div>
        <div className="text-sm font-semibold text-slate-900">Best: {best}</div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className={`text-lg font-bold ${statusColor}`}>{timeLeft}s</div>
        <div className="text-lg font-bold text-slate-900">Score: {score}</div>
      </div>

      <div
        ref={boardRef}
        onClick={onBoardClick}
        className="mt-4 relative w-full aspect-[4/5] max-h-[420px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden touch-manipulation select-none"
      >
        {spawn && (
          <button
            aria-label="target"
            onClick={(e) => {
              e.stopPropagation();
              hit();
            }}
            className="absolute grid place-items-center rounded-full shadow-md active:scale-95 transition-transform"
            style={{
              left: spawn.x,
              top: spawn.y,
              width: targetSize,
              height: targetSize,
              background: "linear-gradient(180deg, #3b82f6, #1d4ed8)",
              color: "white",
            }}
          >
            +1
          </button>
        )}
        {!started && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={start}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow"
            >
              Mulai GimPlay
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={start}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
        >
          {started ? "Restart" : "Start"}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
