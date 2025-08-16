"use client";
import { useCallback, useEffect, useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import SmartImage from "@/components/SmartImage";

export type BannerSlide = { image: string; link?: string };

export default function HeroBannerSliderClient({ slides, intervalMs = 5000 }: { slides: BannerSlide[]; intervalMs?: number }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      },
      slideChanged(s) {
        setSelectedIndex(s.track.details.rel);
      },
    },
    [AutoplayPlugin]
  );

  const scrollTo = useCallback((idx: number) => instanceRef.current?.moveToIdx(idx), [instanceRef]);

  if (!slides || slides.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 mt-4">
      <div className="relative">
        <div className="overflow-hidden">
          <div ref={sliderRef} className="keen-slider">
            {slides.map((s, idx) => (
              <div key={`slide-${idx}`} className="keen-slider__slide">
                <div className="w-full rounded-2xl shadow overflow-hidden bg-[#fefefe]">
                  <div className="relative w-full aspect-[16/6] md:aspect-[16/5]">
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
        </div>
  {/* removed edge gradients */}
        {slides.length > 1 && (
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
    </section>
  );
}
