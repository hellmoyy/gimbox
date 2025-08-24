"use client";
import { useState } from 'react';

export default function MergeDuplicatesButton() {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<null | { mergeGroups:number; merges:any[]; dry:boolean }>(null);
  const [applied, setApplied] = useState<null | { mergeGroups:number; merges:any[]; dry:boolean }>(null);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState<string>('');
  const [provider, setProvider] = useState<string>('');

  async function doFetch(body: any, setter:(v:any)=>void, stateSetter:(v:boolean)=>void) {
    stateSetter(true); setter(null);
    try {
      const res = await fetch('/api/admin/brands/merge-duplicates', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const json = await res.json();
      setter(json);
    } catch (e) {
      alert('Gagal request: '+(e instanceof Error? e.message: String(e)));
    } finally { stateSetter(false); }
  }

  function openModal() { setOpen(true); setPreview(null); setApplied(null); }
  function closeModal() { if (loading || previewLoading) return; setOpen(false); }

  async function runPreview() {
    await doFetch({ dry:true, limit: limit? Number(limit): undefined, provider: provider|| undefined }, setPreview, setPreviewLoading);
  }
  async function runApply() {
    if (!preview) {
      const ok = window.confirm('Belum preview. Lanjut merge langsung?');
      if (!ok) return;
    }
    const confirmRun = window.confirm('Yakin merge sekarang? Brand duplikat akan dinonaktifkan.');
    if (!confirmRun) return;
    await doFetch({ dry:false, limit: limit? Number(limit): undefined, provider: provider|| undefined }, setApplied, setLoading);
  }

  return (
    <>
      <button onClick={openModal} className="bg-rose-600 text-white px-3 py-2 rounded text-sm">Merge Duplicates</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded shadow-lg p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-semibold">Merge Duplicate Brands</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700" aria-label="Close">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Provider (opsional)</label>
                  <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="vcgamers" className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Limit groups (opsional)</label>
                  <input value={limit} onChange={e=>setLimit(e.target.value.replace(/[^0-9]/g,''))} placeholder="0=semua" className="w-full border rounded px-2 py-1" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={runPreview} disabled={previewLoading} className="bg-indigo-600 text-white px-3 py-2 rounded w-full disabled:opacity-60">{previewLoading? 'Preview...' : 'Preview'}</button>
                </div>
              </div>
              {preview && (
                <div className="border rounded p-2 bg-slate-50">
                  <div className="text-xs mb-1">Preview groups: {preview.mergeGroups}</div>
                  <div className="max-h-48 overflow-auto text-[11px] leading-4 font-mono">
                    {preview.merges.map((m:any,i:number)=>(
                      <div key={i}>{m.provider}:{m.ref} {' => '} {m.canonical} ({m.dupes.join(',')}) prod:{m.productsChanged}</div>
                    ))}
                    {preview.merges.length===0 && <div>Tidak ada duplicate.</div>}
                  </div>
                </div>
              )}
              {applied && (
                <div className="border rounded p-2 bg-green-50">
                  <div className="text-xs mb-1 font-medium">Merged groups: {applied.mergeGroups}</div>
                  <div className="max-h-40 overflow-auto text-[11px] leading-4 font-mono">
                    {applied.merges.map((m:any,i:number)=>(
                      <div key={i}>{m.provider}:{m.ref} {' => '} {m.canonical} ({m.dupes.join(',')}) prod:{m.productsChanged}</div>
                    ))}
                    {applied.merges.length===0 && <div>Tidak ada perubahan.</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">Merge menggunakan providerRefs lowercase. Field yang sudah terisi di canonical tidak ditimpa.</div>
              <div className="flex items-center gap-2">
                <button onClick={runApply} disabled={loading} className="bg-rose-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60">{loading? 'Merging...' : 'Apply Merge'}</button>
                <button onClick={closeModal} className="px-3 py-2 text-sm rounded border">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
