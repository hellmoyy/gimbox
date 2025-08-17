"use client";
import { useEffect, useRef, useState } from "react";

type AnimDef = {
  dir: string; // base directory path to frames
  prefix: string; // e.g. "Character-Idle_"
  count: number; // number of frames
  pad?: number; // zero pad width, default 2
  ext?: string; // default 'png'
};

type Props = {
  // Either provide a single image src, or provide an animation set below
  src?: string; // character image (single frame)
  animation?: {
    idle: AnimDef;
    run: AnimDef;
    frameRate?: number; // frames per second, default 12
  };
  width?: number; // px
  height?: number; // px (optional when maintainAspect)
  speed?: number; // px per frame (simple movement)
  maintainAspect?: boolean; // preserve original sprite aspect ratio (uses width), default true
  parallaxSpeed?: number; // background scroll speed in px/sec when moving (default 60)
  showGround?: boolean; // draw a simple ground line; default false when using background
};

export default function GimPlayCharacter({ src = "/images/logo/logo-black.png", animation, width = 64, height = 64, speed = 2, maintainAspect = true, parallaxSpeed = 60, showGround = false }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState(20);
  const [dir, setDir] = useState<"left" | "right">("right");
  const movingRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const [frame, setFrame] = useState(0);
  const frameAccRef = useRef(0); // ms accumulator for frame stepping
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const computedHeight = maintainAspect && natural ? Math.round((width * natural.h) / natural.w) : height;
  const containerHeight = Math.max((computedHeight ?? height) + 24, 160); // ensure room for sprite + ground
  const [bgX, setBgX] = useState(0);

  useEffect(() => {
    const loop = (ts?: number) => {
      const wrap = wrapRef.current;
      if (wrap) {
        const max = Math.max(0, wrap.clientWidth - width - 8);
        const mov = movingRef.current;
        if (mov.left || mov.right) {
          setX((prev) => {
            let nx = prev + (mov.right ? speed : 0) - (mov.left ? speed : 0);
            nx = Math.max(0, Math.min(max, nx));
            return nx;
          });
        }
      }
      // sprite animation timing
      if (animation) {
        const fps = animation.frameRate ?? 12;
        const stepMs = 1000 / fps;
        if (ts == null) ts = performance.now();
        const last = lastTsRef.current ?? ts;
        const delta = ts - last;
        lastTsRef.current = ts;
        frameAccRef.current += delta;
        while (frameAccRef.current >= stepMs) {
          frameAccRef.current -= stepMs;
          setFrame((f) => {
            const moving = movingRef.current.left || movingRef.current.right;
            const def = moving ? animation.run : animation.idle;
            return (f + 1) % def.count;
          });
        }
        // background parallax when moving (time-based)
        const movNow = movingRef.current;
        if (movNow.left || movNow.right) {
          const dirMul = movNow.right ? -1 : 1; // move bg opposite direction
          const px = (parallaxSpeed / 1000) * delta; // px this frame
          setBgX((b) => b + dirMul * px);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [speed, width, animation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") {
        movingRef.current.left = e.type === "keydown";
        setDir("left");
      }
      if (e.code === "ArrowRight") {
        movingRef.current.right = e.type === "keydown";
        setDir("right");
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const bgSrc = "/images/games/background/image.png";
  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-xl border border-slate-200 overflow-hidden"
      style={{
        height: containerHeight,
        backgroundImage: `url(${bgSrc})`,
        backgroundSize: "auto 100%",
  backgroundPosition: `${bgX}px calc(100% + 1px)`,
        backgroundRepeat: "repeat-x",
      }}
    >
      {/* Touch zones for mobile */}
      <div
        className="absolute inset-y-0 left-0 w-1/2"
        onTouchStart={() => {
          movingRef.current.left = true;
          setDir("left");
        }}
        onTouchEnd={() => (movingRef.current.left = false)}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2"
        onTouchStart={() => {
          movingRef.current.right = true;
          setDir("right");
        }}
        onTouchEnd={() => (movingRef.current.right = false)}
      />

  {/* Ground (optional) */}
  {showGround && <div className="absolute bottom-2 left-0 right-0 h-1 bg-slate-200" />}

      {/* Character */}
      {(() => {
        let imgSrc = src;
        if (animation) {
          const moving = movingRef.current.left || movingRef.current.right;
          const def = moving ? animation.run : animation.idle;
          const pad = def.pad ?? 2;
          const ext = def.ext ?? "png";
          const num = String(frame).padStart(pad, "0");
          imgSrc = `${def.dir}/${def.prefix}${num}.${ext}`;
        }
        return (
          <img
            src={imgSrc}
            alt="character"
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth && e.currentTarget.naturalHeight) {
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
              }
            }}
            style={{ width, height: computedHeight, transform: `translateX(${x}px) scaleX(${dir === "left" ? -1 : 1})`, transformOrigin: "center" }}
            className="absolute bottom-2 select-none pointer-events-none drop-shadow"
          />
        );
      })()}

      {/* Hint */}
      <div className="absolute left-2 top-2 text-[11px] px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
        ← → atau tap kiri/kanan
      </div>
    </div>
  );
}
