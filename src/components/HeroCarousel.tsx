import { defaultBanners, getBanners } from "../lib/banners";
import SmartImage from "@/components/SmartImage";
import HeroBannerSliderClient from "@/components/HeroBannerSliderClient";

export default async function HeroCarousel() {
  const banners = (await getBanners(true)) || [];
  // Debug marker (view page source) helps diagnose production issue where slider not appearing
  // Remove once resolved.
  // eslint-disable-next-line no-console
  console.log('[HeroCarousel] fetched banners:', banners.length, banners.map(b=>({image:b.image, variants:(b as any).variants?.length||0})));
  if (!banners.length) return null;
  function renderPicture(b: any) {
    const vars: string[] = Array.isArray(b.variants) ? b.variants : [];
    const md = vars.find((v) => /-md\./.test(v));
    const lg = vars.find((v) => /-lg\./.test(v));
  // Now prefer medium variant for all viewports to reduce payload; fallback to lg then base image
  const main = md || lg || b.image;
    return (
      <picture>
    {/* Use the same md image for all breakpoints; if md missing, main already covers fallback */}
    <source media="(max-width: 900px)" srcSet={main} />
    <source media="(min-width: 901px)" srcSet={main} />
        {/* SmartImage fallback to handle error chain */}
        <SmartImage src={main} alt="Banner" className="w-full h-full object-cover object-center" loading="eager" />
      </picture>
    );
  }
  if (banners.length === 1) {
    const b = banners[0];
    return (
      <section className="mx-auto max-w-6xl px-4 mt-4">
        <div className="rounded-2xl shadow overflow-hidden aspect-[16/6] md:aspect-[16/5]">
          {b.link ? (
            <a href={b.link}>{renderPicture(b)}</a>
          ) : (
            renderPicture(b)
          )}
        </div>
      </section>
    );
  }
  // Map banners to slides with primary image (largest) and preserve link
  const slides = banners.map((b: any) => ({ image: (Array.isArray(b.variants) && (b.variants.find((v:string)=>/-md\./.test(v)) || b.variants.find((v:string)=>/-lg\./.test(v)))) || b.image, link: b.link, variants: b.variants }));
  if (!slides.length) {
    return (
      <section className="mx-auto max-w-6xl px-4 mt-4">
        <div className="text-sm text-gray-500">Tidak ada banner aktif (debug).</div>
      </section>
    );
  }
  return <HeroBannerSliderClient slides={slides as any} />;
}
