"use client";
import { useEffect, useRef, useState } from "react";

// A tiny endless runner: tap/space to jump, avoid obstacles, score by time
export default function GimPlayRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem("gimplay_runner_best") || "0");
    return Number.isFinite(v) ? v : 0;
  });
  const [gameOver, setGameOver] = useState(false);

  // Game state
  const player = useRef({ x: 24, y: 0, w: 28, h: 28, vy: 0, onGround: false });
  const groundY = 150; // logical pixels
  const gravity = 0.7;
  const jumpV = -11.5;
  const obs = useRef<{ x: number; w: number; h: number }[]>([]);
  const speed = useRef(3.2);
  const raf = useRef<number | null>(null);
  const lastSpawn = useRef(0);

  function reset() {
    setGameOver(false);
    setScore(0);
    speed.current = 3.2;
    obs.current = [];
    player.current = { x: 24, y: groundY - 28, w: 28, h: 28, vy: 0, onGround: true };
  }

  function jump() {
    if (!running || gameOver) return;
    if (player.current.onGround) {
      player.current.vy = jumpV;
      player.current.onGround = false;
    }
  }

  // Controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, gameOver]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // Resize for devicePixelRatio
    function fit() {
      if (!cvs || !ctx) return;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const cssW = cvs.parentElement ? cvs.parentElement.clientWidth : 320;
      const cssH = 200;
      cvs.style.width = cssW + "px";
      cvs.style.height = cssH + "px";
      cvs.width = Math.floor(cssW * dpr);
      cvs.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cvs.parentElement || cvs);

    let t0 = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(33, t - t0); // ms
      t0 = t;

      // Clear
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Draw ground
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(0, groundY + 16, cvs.width, 4);

      if (running && !gameOver) {
        // Spawn obstacles
        lastSpawn.current += dt;
        const spawnEvery = Math.max(700, 1200 - speed.current * 100);
        if (lastSpawn.current > spawnEvery) {
          lastSpawn.current = 0;
          const h = 20 + Math.floor(Math.random() * 24);
          obs.current.push({ x: (cvs.width as number) / (window.devicePixelRatio || 1) + 10, w: 14 + Math.random() * 12, h });
        }

        // Move obstacles
        for (const o of obs.current) o.x -= speed.current;
        obs.current = obs.current.filter((o) => o.x + o.w > -10);

        // Player physics
        player.current.vy += gravity;
        player.current.y += player.current.vy;
        if (player.current.y + player.current.h >= groundY) {
          player.current.y = groundY - player.current.h;
          player.current.vy = 0;
          player.current.onGround = true;
        }

        // Score & difficulty
        setScore((s) => s + Math.floor(dt / 16));
        speed.current = Math.min(8, speed.current + dt * 0.0002);

        // Collisions
        const pr = player.current;
        for (const o of obs.current) {
          const px = pr.x, py = pr.y, pw = pr.w, ph = pr.h;
          const ox = o.x, oy = groundY - o.h, ow = o.w, oh = o.h;
          if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
            setGameOver(true);
            setRunning(false);
            setBest((prev) => {
              const next = Math.max(prev, score);
              try { localStorage.setItem("gimplay_runner_best", String(next)); } catch {}
              return next;
            });
            break;
          }
        }
      }

      // Draw player
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(player.current.x, player.current.y, player.current.w, player.current.h);
      // Draw obstacles
      ctx.fillStyle = "#ef4444";
      for (const o of obs.current) {
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      }

      // HUD
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText(`Score: ${score}`, 10, 16);
      ctx.fillText(`Best: ${best}`, 10, 32);

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [running, gameOver, score, best]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fefefe] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">Ninja Run</div>
        <div className="text-sm font-semibold text-slate-900">Best: {best}</div>
      </div>
      <div
        className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
        onClick={jump}
        role="button"
        aria-label="game-canvas"
      >
        <canvas ref={canvasRef} />
        {!running && !gameOver && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              onClick={() => {
                reset();
                setRunning(true);
              }}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow"
            >
              Start
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">Game Over</div>
              <div className="text-sm text-slate-600 mb-3">Score: {score}</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    reset();
                    setRunning(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                >
                  Restart
                </button>
                <button
                  onClick={() => {
                    reset();
                    setRunning(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-500">Tap/Space to jump • Hindari rintangan</div>
    </div>
  );
}
