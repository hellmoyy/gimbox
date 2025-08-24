"use client";
import { useEffect, useState } from 'react';
import Section from "./Section";
import CategoryGrid from "./CategoryGrid";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center gap-3">
      <div className="h-16 w-16 rounded-full bg-slate-200" />
      <div className="h-3 w-20 rounded bg-slate-200" />
      <div className="h-3 w-14 rounded bg-slate-100" />
    </div>
  );
}

const skeletonList = Array.from({ length: 6 });

export default function HomeSections() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [] } as any);
  useEffect(()=>{
    let ignore=false;
    async function load(){
      try {
        const res = await fetch('/api/public/home-products', { cache: 'no-store' });
        const j = await res.json();
        if(!ignore && j?.success) setData(j);
      } catch {} finally { if(!ignore) setLoading(false); }
    }
    load();
    return ()=>{ignore=true};
  },[]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 mt-2">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
          {loading ? (
            <div className="flex items-center gap-3">
              {["w-24","w-28","w-24","w-32","w-28","w-32"].map((w,i)=>(
                <div key={i} className={`shrink-0 h-9 ${w} rounded-full bg-slate-200 animate-pulse`} />
              ))}
            </div>
          ) : (
            [{ label: 'Populer', icon: '🔥', href: '#populer' },{ label: 'Baru Rilis', icon: '✨', href: '#baru-rilis' },{ label: 'Voucher', icon: '🎟️', href: '#voucher' },{ label: 'Pulsa & Tagihan', icon: '📱', href: '#pulsa-tagihan' },{ label: 'Entertainment', icon: '🎬', href: '#entertainment' },{ label: 'Semua Produk', icon: '🛍️', href: '#semua-produk' }].map(({label,icon,href})=> (
              <a key={label} href={href} className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 bg-[#fefefe] text-slate-800 text-sm font-medium shadow-sm hover:shadow-md hover:border-slate-400 transition whitespace-nowrap">
                <span className="text-base leading-none">{icon}</span><span>{label}</span>
              </a>
            ))
          )}
        </div>
      </div>
      <div id="populer" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">🔥</span>
            <h2 className="text-[15px] font-medium tracking-wide">Populer</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.featured.length === 0 ? <div className="text-sm text-slate-500">Belum ada produk featured.</div> : <CategoryGrid items={data.featured as any} showLimit={8} />)}
      </div>
      <div id="baru-rilis" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">✨</span>
            <h2 className="text-[15px] font-medium tracking-wide">Baru Rilis</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.newRelease.length === 0 ? <div className="text-sm text-slate-500">Belum ada produk baru rilis.</div> : <CategoryGrid items={data.newRelease as any} showLimit={8} />)}
      </div>
      <div id="voucher" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">🎟️</span>
            <h2 className="text-[15px] font-medium tracking-wide">Voucher</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.voucher.length === 0 ? <div className="text-sm text-slate-500">Belum ada produk voucher.</div> : <CategoryGrid items={data.voucher as any} showLimit={8} />)}
      </div>
      <div id="pulsa-tagihan" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">📱</span>
            <h2 className="text-[15px] font-medium tracking-wide">Pulsa & Tagihan</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.pulsaTagihan.length === 0 ? <div className="text-sm text-slate-500">Belum ada produk pulsa & tagihan.</div> : <CategoryGrid items={data.pulsaTagihan as any} showLimit={8} />)}
      </div>
      <div id="entertainment" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">🎬</span>
            <h2 className="text-[15px] font-medium tracking-wide">Entertainment</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.entertainment.length === 0 ? <div className="text-sm text-slate-500">Belum ada produk entertainment.</div> : <CategoryGrid items={data.entertainment as any} showLimit={8} />)}
      </div>
      <div id="semua-produk" className="mx-auto w-full max-w-md px-4 mt-6">
        {loading ? (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 text-slate-800">
            <span className="text-base">🛍️</span>
            <h2 className="text-[15px] font-medium tracking-wide">Semua Produk</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
        {loading ? <div className="grid grid-cols-3 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (data.all.length === 0 ? <div className="text-sm text-slate-500 mt-2">Belum ada data game.</div> : <CategoryGrid items={data.all as any} showLimit={8} />)}
      </div>
    </>
  );
}
