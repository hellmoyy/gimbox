import { defaultBanners, getBanners } from "../lib/banners";
import SmartImage from "@/components/SmartImage";
import HeroBannerSliderClient from "@/components/HeroBannerSliderClient";

export default async function HeroCarousel() {
  let banners: any[] = [];
  let error: string | null = null;
  try {
    banners = (await getBanners(true)) || [];
  } catch (e: any) {
    error = e?.message || 'unknown error';
  }
  // Debug marker (view page source) helps diagnose production issue where slider not appearing
  // Remove once resolved.
  // eslint-disable-next-line no-console
  console.log('[HeroCarousel] fetched banners:', banners.length, banners.map(b=>({image:b.image, variants:(b as any).variants?.length||0})), 'error?', error);
  if (!banners.length) {
    return (
      <section className="mx-auto max-w-6xl px-4 mt-4" data-banner-debug="empty">
        <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-xs text-gray-600 bg-white/50">
          <strong>Banner kosong</strong><br />
          {error && <span className="text-red-600">Error: {error}</span>}
          {!error && <>
            Tidak ada data banner aktif.<br />
            Cek: (1) Data di koleksi Mongo 'banners'. (2) Field isActive tidak false. (3) URL image/variants menunjuk CDN (R2) dan bukan path lokal 404.<br />
            Env R2 aktif: {process.env.R2_BUCKET ? 'ya' : 'tidak'} | CDN: {process.env.R2_PUBLIC_BASE ? 'ya' : 'tidak'}
          </>}
        </div>
      </section>
    );
  }
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
