"use client";
import { useEffect, useState } from 'react';
import Section from "./Section";
import CategoryGrid from "./CategoryGrid";
import BrandGrid from "./BrandGrid";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center gap-3">
      <div className="h-16 w-16 rounded-full bg-slate-200" />
      <div className="h-3 w-20 rounded bg-slate-200" />
      <div className="h-3 w-14 rounded bg-slate-100" />
    </div>
  );
}

const skeletonList = Array.from({ length: 8 });

export default function HomeSections() {
  const [loading, setLoading] = useState(true);
  const [brandData, setBrandData] = useState({ featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [] } as any);
  const [categories, setCategories] = useState<any[]>([]);
  // Helper: find category by code OR (case-insensitive) name fallback
  function findCategory(code: string, label: string) {
    const lower = label.toLowerCase();
    return categories.find(c => c.code === code || c.name?.toLowerCase() === lower);
  }
  useEffect(()=>{
    let ignore=false;
    async function load(){
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/public/categories', { cache: 'no-store' }),
          fetch('/api/public/home-brands', { cache: 'no-store' }),
        ]);
        const c = await catRes.json();
        const b = await brandRes.json();
        if(!ignore && c?.success) setCategories(c.categories || []);
        if(!ignore && b?.success) setBrandData(b);
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
            [
              { label: 'Populer', code: 'populer', fallback: '🔥', href: '#populer' },
              { label: 'Baru Rilis', code: 'baru-rilis', fallback: '✨', href: '#baru-rilis' },
              { label: 'Voucher', code: 'voucher', fallback: '🎟️', href: '#voucher' },
              { label: 'Pulsa & Tagihan', code: 'pulsa-tagihan', fallback: '📱', href: '#pulsa-tagihan' },
              { label: 'Entertainment', code: 'entertainment', fallback: '🎬', href: '#entertainment' },
              { label: 'Semua Produk', code: 'semua-produk', fallback: '🛍️', href: '#semua-produk' },
            ].map(({label,code,fallback,href})=> {
              const cat = categories.find(c => c.code === code || c.name?.toLowerCase() === label.toLowerCase());
              const iconUrl = cat?.icon as string | undefined;
              return (
                <a key={label} href={href} className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 bg-[#fefefe] text-slate-800 text-sm font-medium shadow-sm hover:shadow-md hover:border-slate-400 transition whitespace-nowrap">
                  {iconUrl ? (
                    <img src={iconUrl} alt={label} className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-base leading-none">{fallback}</span>
                  )}
                  <span>{label}</span>
                </a>
              );
            })
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
    {(() => { const cat = findCategory('populer','Populer'); return cat?.icon ? <img src={cat.icon} alt="Populer" className="w-5 h-5 object-contain" /> : <span className="text-base">🔥</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Populer</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.featured.length === 0 ? <div className="text-sm text-slate-500">Belum ada brand populer.</div> : <BrandGrid items={brandData.featured as any} showLimit={12} />)}
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
    {(() => { const cat = findCategory('baru-rilis','Baru Rilis'); return cat?.icon ? <img src={cat.icon} alt="Baru Rilis" className="w-5 h-5 object-contain" /> : <span className="text-base">✨</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Baru Rilis</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.newRelease.length === 0 ? <div className="text-sm text-slate-500">Belum ada brand baru rilis.</div> : <BrandGrid items={brandData.newRelease as any} showLimit={12} />)}
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
    {(() => { const cat = findCategory('voucher','Voucher'); return cat?.icon ? <img src={cat.icon} alt="Voucher" className="w-5 h-5 object-contain" /> : <span className="text-base">🎟️</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Voucher</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.voucher.length === 0 ? <div className="text-sm text-slate-500">Belum ada brand voucher.</div> : <BrandGrid items={brandData.voucher as any} showLimit={12} />)}
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
    {(() => { const cat = findCategory('pulsa-tagihan','Pulsa & Tagihan'); return cat?.icon ? <img src={cat.icon} alt="Pulsa & Tagihan" className="w-5 h-5 object-contain" /> : <span className="text-base">📱</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Pulsa & Tagihan</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.pulsaTagihan.length === 0 ? <div className="text-sm text-slate-500">Belum ada brand pulsa & tagihan.</div> : <BrandGrid items={brandData.pulsaTagihan as any} showLimit={12} />)}
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
    {(() => { const cat = findCategory('entertainment','Entertainment'); return cat?.icon ? <img src={cat.icon} alt="Entertainment" className="w-5 h-5 object-contain" /> : <span className="text-base">🎬</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Entertainment</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.entertainment.length === 0 ? <div className="text-sm text-slate-500">Belum ada brand entertainment.</div> : <BrandGrid items={brandData.entertainment as any} showLimit={12} />)}
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
    {(() => { const cat = findCategory('semua-produk','Semua Produk'); return cat?.icon ? <img src={cat.icon} alt="Semua Produk" className="w-5 h-5 object-contain" /> : <span className="text-base">🛍️</span>; })()}
            <h2 className="text-[15px] font-medium tracking-wide">Semua Produk</h2>
            <div className="ml-auto h-px bg-slate-200 w-24" />
          </div>
        )}
  {loading ? <div className="grid grid-cols-4 gap-3">{skeletonList.map((_,i)=><SkeletonCard key={i} />)}</div> : (brandData.all.length === 0 ? <div className="text-sm text-slate-500 mt-2">Belum ada data brand.</div> : <BrandGrid items={brandData.all as any} showLimit={16} />)}
      </div>
    </>
  );
}
