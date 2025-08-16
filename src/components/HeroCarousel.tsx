import { defaultBanners, getBanners } from "../lib/banners";
import SmartImage from "@/components/SmartImage";
import HeroBannerSliderClient from "@/components/HeroBannerSliderClient";

export default async function HeroCarousel() {
  const banners = (await getBanners(true)) || [];
  if (!banners.length) return null;
  if (banners.length === 1) {
    const b = banners[0];
    return (
    <section className="mx-auto max-w-6xl px-4 mt-4">
  <div className="rounded-2xl shadow overflow-hidden aspect-[16/6] md:aspect-[16/5]">
          {b.link ? (
            <a href={b.link}>
              <SmartImage src={b.image} alt="Banner" className="w-full h-full object-cover object-center" />
            </a>
          ) : (
              <SmartImage src={b.image} alt="Banner" className="w-full h-full object-cover object-center" />
          )}
        </div>
      </section>
    );
  }
  return <HeroBannerSliderClient slides={banners as any} />;
}
