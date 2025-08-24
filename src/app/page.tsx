import HeroCarousel from "../components/HeroCarousel";
import HomeSections from "@/components/HomeSections";
import { Suspense } from "react";

function BannerSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-4">
      <div className="rounded-2xl overflow-hidden">
        <div className="w-full aspect-[16/6] md:aspect-[16/5] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
      </div>
    </section>
  );
}

export default async function Home() {
  return (
    <main className="min-h-screen pb-24">
      <Suspense fallback={<BannerSkeleton />}> 
        <HeroCarousel />
      </Suspense>
      <HomeSections />
    </main>
  );
}

// Force dynamic so banner DB fetch isn't statically optimized away in production
export const dynamic = 'force-dynamic';
export const revalidate = 0;
