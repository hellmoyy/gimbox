import HeroCarousel from "../components/HeroCarousel";
import { Suspense } from "react";
import { fetchHomeBrands, fetchCategories } from '@/lib/homeServer';
import Link from 'next/link';
import SmartImage from '@/components/SmartImage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top Up Game Murah & Cepat | Voucher Game & Pulsa Termurah - Gimbox.id',
  description: 'Top up game & voucher termurah, cepat, aman. Support Mobile Legends, Free Fire, Valorant, HOK, CODM, FF, voucher streaming, pulsa & tagihan. Bayar otomatis banyak metode. Diskon & promo harian!'
};

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
  // Server-side fetch for SEO + faster TTFB (avoid client waterfall)
  const [brands, categories] = await Promise.all([
    fetchHomeBrands().catch(()=>({ featured:[], newRelease:[], voucher:[], pulsaTagihan:[], entertainment:[], all:[] } as any)),
    fetchCategories().catch(()=>[]),
  ]);

  function SectionHeader({ id, label, iconFallback }: { id: string; label: string; iconFallback: string; }) {
    const cat = categories.find((c:any)=> c.code === id || c.name?.toLowerCase() === label.toLowerCase());
    return (
      <div className="flex items-center gap-2 mb-3 text-slate-800" id={id}>
        {cat?.icon ? <img src={cat.icon} alt={label} className="w-5 h-5 object-contain"/> : <span className="text-base">{iconFallback}</span>}
        <h2 className="text-[15px] font-semibold tracking-wide">{label}</h2>
        <div className="ml-auto h-px bg-slate-200 w-24" />
      </div>
    );
  }

  function BrandGrid({ list, limit=12 }: { list: any[]; limit?: number }) {
    const items = list.slice(0, limit);
    return (
      <div className="grid grid-cols-4 gap-3">
        {items.map(b=> (
          <div key={b.code} className="bg-[#fefefe] rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition p-2 w-full">
            <Link href={`/topup/${b.code}`} className="flex flex-col items-center text-center" prefetch={true}>
              <div className="relative w-full aspect-square">
                <SmartImage src={b.icon || '/images/logo/gimbox.gif'} alt={b.name} className="w-full h-full rounded-xl object-cover" />
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-[#111827] line-clamp-2 leading-snug min-h-[32px]">{b.name}</div>
            </Link>
          </div>
        ))}
      </div>
    );
  }

  const navLinks = [
    { label: 'Populer', id: 'populer', icon: '🔥' },
    { label: 'Baru Rilis', id: 'baru-rilis', icon: '✨' },
    { label: 'Voucher', id: 'voucher', icon: '🎟️' },
    { label: 'Pulsa & Tagihan', id: 'pulsa-tagihan', icon: '📱' },
    { label: 'Entertainment', id: 'entertainment', icon: '🎬' },
    { label: 'Semua Produk', id: 'semua-produk', icon: '🛍️' },
  ];

  return (
    <main className="min-h-screen pb-24">
      <Suspense fallback={<BannerSkeleton />}> 
        <HeroCarousel />
      </Suspense>
      {/* Top category nav for internal linking */}
      <nav className="mx-auto max-w-6xl px-4 mt-2" aria-label="Kategori utama">
        <ul className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
          {navLinks.map(n => (
            <li key={n.id} className="shrink-0">
              <a href={`#${n.id}`} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 bg-[#fefefe] text-slate-800 text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <span className="text-base leading-none">{n.icon}</span>
                <span>{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="populer" label="Populer" iconFallback="🔥" />
        {brands.featured.length ? <BrandGrid list={brands.featured} limit={12} /> : <p className="text-sm text-slate-500">Belum ada brand populer.</p>}
      </div>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="baru-rilis" label="Baru Rilis" iconFallback="✨" />
        {brands.newRelease.length ? <BrandGrid list={brands.newRelease} limit={12} /> : <p className="text-sm text-slate-500">Belum ada brand baru rilis.</p>}
      </div>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="voucher" label="Voucher" iconFallback="🎟️" />
        {brands.voucher.length ? <BrandGrid list={brands.voucher} limit={12} /> : <p className="text-sm text-slate-500">Belum ada brand voucher.</p>}
      </div>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="pulsa-tagihan" label="Pulsa & Tagihan" iconFallback="📱" />
        {brands.pulsaTagihan.length ? <BrandGrid list={brands.pulsaTagihan} limit={12} /> : <p className="text-sm text-slate-500">Belum ada brand pulsa & tagihan.</p>}
      </div>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="entertainment" label="Entertainment" iconFallback="🎬" />
        {brands.entertainment.length ? <BrandGrid list={brands.entertainment} limit={12} /> : <p className="text-sm text-slate-500">Belum ada brand entertainment.</p>}
      </div>
      <div className="mx-auto w-full max-w-md px-4 mt-6">
        <SectionHeader id="semua-produk" label="Semua Produk" iconFallback="🛍️" />
        {brands.all.length ? <BrandGrid list={brands.all} limit={16} /> : <p className="text-sm text-slate-500 mt-2">Belum ada data brand.</p>}
      </div>
      {/* SEO Rich Text Block */}
      <section className="mx-auto max-w-4xl px-4 mt-12 prose prose-slate prose-sm">
        <h2>Top Up Game Murah, Aman, dan Instan di Gimbox.id</h2>
        <p>Gimbox.id adalah platform top up game & voucher digital Indonesia yang fokus pada kecepatan transaksi, harga kompetitif, dan layanan ramah. Dukung berbagai game populer seperti Mobile Legends, Free Fire, Valorant, Honor of Kings, CODM, dan banyak lagi.</p>
        <h3>Kenapa Pilih Kami?</h3>
        <ul>
          <li>Transaksi cepat & otomatis (auto detect pembayaran).</li>
          <li>Metode bayar lengkap: e-wallet, virtual account, QRIS, pulsa.</li>
          <li>Harga transparan tanpa biaya tersembunyi.</li>
          <li>Dukungan pelanggan responsif & live update status order.</li>
        </ul>
        <h3>Cara Top Up</h3>
        <ol>
          <li>Pilih game atau produk.</li>
          <li>Masukkan ID / User data yang diminta.</li>
          <li>Pilih nominal & metode bayar.</li>
          <li>Selesaikan pembayaran & item langsung diproses.</li>
        </ol>
        <p>Gabung sekarang dan nikmati promo menarik setiap hari. Bookmark halaman ini untuk akses cepat ke top up favoritmu!</p>
      </section>
      {/* Structured Data JSON-LD */}
      <script suppressHydrationWarning type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
        '@context':'https://schema.org',
        '@type':'WebSite',
        name:'Gimbox.id',
        url: process.env.NEXT_PUBLIC_SITE_URL || 'https://gimbox.id',
        potentialAction:{
          '@type':'SearchAction',
          target:(process.env.NEXT_PUBLIC_SITE_URL || 'https://gimbox.id') + '/search?q={search_term_string}',
          'query-input':'required name=search_term_string'
        }
      })}} />
    </main>
  );
}

// Force dynamic so banner DB fetch isn't statically optimized away in production
export const dynamic = 'force-dynamic';
export const revalidate = 60; // allow short ISR for cache while keeping fresh
