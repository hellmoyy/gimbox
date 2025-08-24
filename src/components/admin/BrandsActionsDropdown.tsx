"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import FullSyncButton from './FullSyncButton';
import MergeDuplicatesButton from './MergeDuplicatesButton';
import DeleteInactiveBrandsButton from './DeleteInactiveBrandsButton';

export default function BrandsActionsDropdown(){
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);
  const [showApplyMarkup,setShowApplyMarkup] = useState(false);
  const [applyPreview,setApplyPreview] = useState<any>(null);
  const [loadingApply,setLoadingApply] = useState(false);
  const [showEnrich,setShowEnrich] = useState(false);
  const [enrichPreview,setEnrichPreview] = useState<any>(null);
  const [loadingEnrich,setLoadingEnrich] = useState(false);
  useEffect(()=>{
    function onDoc(e:MouseEvent){ if (!ref.current) return; if (!ref.current.contains(e.target as any)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDoc);
    return ()=> document.removeEventListener('mousedown', onDoc);
  },[open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={()=>setOpen(o=>!o)} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1">
        Aksi <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[88vw] bg-white border rounded shadow-lg p-3 z-50 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Quick Links</span>
            <button onClick={()=>setOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Tutup</button>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/admin/brands/new" className="px-2 py-1 rounded bg-green-600 text-white text-center text-xs">Tambah Brand</Link>
            <Link href="/admin/products/sync" className="px-2 py-1 rounded bg-indigo-500 text-white text-center text-xs">Sync Harga VCG</Link>
          </div>
          <div className="border-t pt-2 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Data Tools</div>
            <div className="space-y-2">
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-[11px] font-medium mb-1">Full Sync Provider</div>
                <FullSyncButton />
              </div>
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-[11px] font-medium mb-2">Merge Duplicates</div>
                <MergeDuplicatesButton />
              </div>
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-[11px] font-medium mb-2">Delete Nonaktif</div>
                <DeleteInactiveBrandsButton />
              </div>
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-[11px] font-medium mb-2">Apply Default Markup 1%</div>
                <button onClick={()=>setShowApplyMarkup(true)} className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white text-xs disabled:opacity-50" disabled={loadingApply}>Open</button>
              </div>
              <div className="border rounded p-2 bg-slate-50">
                <div className="text-[11px] font-medium mb-2">Sync Developer & Publisher</div>
                <button onClick={()=>setShowEnrich(true)} className="px-2 py-1 rounded bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs disabled:opacity-50" disabled={loadingEnrich}>Open</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showApplyMarkup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Apply 1% Default Markup</h3>
              <button onClick={()=>{setShowApplyMarkup(false); setApplyPreview(null);}} className="text-xs text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <p className="text-xs text-slate-600">Semua brand dengan defaultMarkupPercent kosong / null / 0 akan diset menjadi 1. Lakukan Preview dahulu.</p>
            <div className="flex gap-2">
              <button disabled={loadingApply} onClick={async()=>{ setLoadingApply(true); try { const r = await fetch('/api/admin/brands/apply-default-markup?dry=1',{method:'POST'}); const j = await r.json(); setApplyPreview(j);} finally { setLoadingApply(false);} }} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs disabled:opacity-50">Preview</button>
              <button disabled={loadingApply || !applyPreview} onClick={async()=>{ if(!applyPreview) return; if(!confirm('Apply 1% ke '+applyPreview.candidates+' brand?')) return; setLoadingApply(true); try { const r = await fetch('/api/admin/brands/apply-default-markup',{method:'POST'}); const j = await r.json(); setApplyPreview(j);} finally { setLoadingApply(false);} }} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs disabled:opacity-50">Apply</button>
              <button onClick={()=>{setShowApplyMarkup(false); setApplyPreview(null);}} className="px-3 py-1.5 rounded bg-gray-200 text-xs">Tutup</button>
            </div>
            {loadingApply && <div className="text-xs text-slate-500">Processing...</div>}
            {applyPreview && (
              <div className="border rounded p-2 bg-slate-50 max-h-60 overflow-auto text-xs">
                <div>Dry: {String(applyPreview.dry)}</div>
                <div>Candidates: {applyPreview.candidates}</div>
                <div>Modified: {applyPreview.modified}</div>
                <div className="mt-2 font-semibold">Sample:</div>
                <ul className="list-disc ml-4">
                  {applyPreview.sample?.map((s:any)=> <li key={s.code}>{s.code} (was {s.defaultMarkupPercent ?? 'undefined'})</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      {showEnrich && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sync Developer & Publisher</h3>
              <button onClick={()=>{setShowEnrich(false); setEnrichPreview(null);}} className="text-xs text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <p className="text-xs text-slate-600">Mengisi developer/publisher yang kosong menggunakan sumber (RAWG / Wikipedia). Gunakan Preview terlebih dahulu. Limit default 100.</p>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={500} placeholder="Limit" className="w-24 border rounded px-2 py-1 text-xs bg-[#fefefe]" onChange={e=>{ const v = e.target.value; setEnrichPreview((p:any)=> p ? { ...p, _limitOverride: v } : { _limitOverride: v }); }} />
              <button disabled={loadingEnrich} onClick={async()=>{ setLoadingEnrich(true); try { const limit = (enrichPreview?._limitOverride)||''; const r = await fetch(`/api/admin/brands/enrich-devpub?dry=1${limit?`&limit=${limit}`:''}`,{method:'POST'}); const j = await r.json(); setEnrichPreview(j);} finally { setLoadingEnrich(false);} }} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs disabled:opacity-50">Preview</button>
              <button disabled={loadingEnrich || !enrichPreview} onClick={async()=>{ if(!enrichPreview) return; if(!confirm('Apply enrichment untuk '+enrichPreview.scanned+' brand?')) return; setLoadingEnrich(true); try { const limit = (enrichPreview?._limitOverride)||''; const r = await fetch(`/api/admin/brands/enrich-devpub${limit?`?limit=${limit}`:''}`,{method:'POST'}); const j = await r.json(); setEnrichPreview(j);} finally { setLoadingEnrich(false);} }} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs disabled:opacity-50">Apply</button>
              <button onClick={()=>{setShowEnrich(false); setEnrichPreview(null);}} className="px-3 py-1.5 rounded bg-gray-200 text-xs">Tutup</button>
            </div>
            {loadingEnrich && <div className="text-xs text-slate-500">Processing...</div>}
            {enrichPreview && (
              <div className="border rounded p-2 bg-slate-50 max-h-60 overflow-auto text-xs">
                <div>Dry: {String(enrichPreview.dry)}</div>
                <div>Scanned: {enrichPreview.scanned}</div>
                <div>Enriched: {enrichPreview.enriched}</div>
                <div className="mt-2 font-semibold">Sample (max 25):</div>
                <ul className="list-disc ml-4">
                  {enrichPreview.results?.map((r:any)=> <li key={r.code}>{r.code}: {r.before.developer||'-'} → {r.after.developer||'-'} | {r.before.publisher||'-'} → {r.after.publisher||'-'}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
