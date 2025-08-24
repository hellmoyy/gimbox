"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import FullSyncButton from './FullSyncButton';
import MergeDuplicatesButton from './MergeDuplicatesButton';
import DeleteInactiveBrandsButton from './DeleteInactiveBrandsButton';

export default function BrandsActionsDropdown(){
  const [open,setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
