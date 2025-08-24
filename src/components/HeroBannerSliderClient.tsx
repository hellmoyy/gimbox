"use client";
import { useCallback, useEffect, useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import SmartImage from "@/components/SmartImage";

export type BannerSlide = { image: string; link?: string };

export default function HeroBannerSliderClient({ slides, intervalMs = 5000 }: { slides: BannerSlide[]; intervalMs?: number }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ready, setReady] = useState(false);

  // Simple autoplay plugin for Keen
  function AutoplayPlugin(slider: any) {
    let timeout: any;
    let mouseOver = false;
    function clearNextTimeout() {
      clearTimeout(timeout);
    }
    function nextTimeout() {
      clearTimeout(timeout);
      if (mouseOver) return;
      timeout = setTimeout(() => {
        slider.next();
      }, Math.max(2000, intervalMs));
    }
    slider.on("created", () => {
      slider.container.addEventListener("mouseenter", () => {
        mouseOver = true;
        clearNextTimeout();
      });
      slider.container.addEventListener("mouseleave", () => {
        mouseOver = false;
        nextTimeout();
      });
      nextTimeout();
    });
    slider.on("dragStarted", clearNextTimeout);
    slider.on("animationEnded", nextTimeout);
    slider.on("updated", nextTimeout);
  }

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: true,
      renderMode: "performance",
      slides: {
        perView: 1.25, // show ~80% width slide with peek
        spacing: 16, // ~gap-4
        origin: "center",
      },
      created(s) {
        setSelectedIndex(s.track.details.rel);
        // Delay one frame to ensure layout ready then fade in
        requestAnimationFrame(()=> setReady(true));
      },
      slideChanged(s) {
        setSelectedIndex(s.track.details.rel);
      },
    },
    [AutoplayPlugin]
  );

  // Safety fallback: if after 1.2s slider not marked ready (maybe plugin failed on prod) force show static slides
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      if (!ready) setReady(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [ready]);

  const scrollTo = useCallback((idx: number) => instanceRef.current?.moveToIdx(idx), [instanceRef]);

  if (!slides || slides.length === 0) return null;

  // Fallback simple scroll if Keen somehow not attached yet but ready forced
  const keenActive = !!instanceRef.current;

  return (
    <section className="mx-auto max-w-6xl px-4 mt-4">
      <div className="relative">
        {/* Aspect ratio wrapper reserves height early to prevent layout shift */}
        <div className="relative w-full aspect-[16/6] md:aspect-[16/5]">
          {/** Primary Keen slider container */}
          <div
            ref={sliderRef}
            className={`keen-slider h-full transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'} ${!ready ? 'pointer-events-none' : ''}`}
          >
            {slides.map((s, idx) => (
              <div key={`slide-${idx}`} className="keen-slider__slide h-full flex">
                <div className="w-full h-full rounded-2xl shadow overflow-hidden bg-[#fefefe]">
                  <div className="relative w-full h-full">
                    {s.link && s.link.trim() !== "" ? (
                      <a href={s.link} className="absolute inset-0 block">
                        <SmartImage src={s.image} alt="Banner" className="w-full h-full object-cover object-center" loading="eager" />
                      </a>
                    ) : (
                      <SmartImage src={s.image} alt="Banner" className="absolute inset-0 w-full h-full object-cover object-center" loading="eager" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!keenActive && ready && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="w-full h-full flex gap-4 overflow-x-auto no-scrollbar p-1">
                {slides.map((s, idx) => (
                  <div key={`fallback-${idx}`} className="flex-none w-full rounded-2xl shadow overflow-hidden bg-[#fefefe]">
                    {s.link ? (
                      <a href={s.link} className="block w-full h-full">
                        <SmartImage src={s.image} alt="Banner" className="w-full h-full object-cover object-center" loading="eager" />
                      </a>
                    ) : (
                      <SmartImage src={s.image} alt="Banner" className="w-full h-full object-cover object-center" loading="eager" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!ready && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
            </div>
          )}
          {ready && slides.length > 1 && keenActive && (
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 z-10 pointer-events-none">
              {slides.map((_, idx) => (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => scrollTo(idx)}
                  className={`pointer-events-auto rounded-full transition-colors ${idx === selectedIndex ? "bg-[#fefefe]" : "bg-[rgba(254,254,254,0.5)] hover:bg-[rgba(254,254,254,0.8)]"} w-2.5 h-2.5 md:w-3 md:h-3`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
