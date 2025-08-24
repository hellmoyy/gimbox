"use client";
import { useState } from 'react';

export default function DeleteInactiveBrandsButton(){
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState<null | { matched:number; deleted:number; dry:boolean; mergedOnly:boolean; sample:any[] }>(null);
  const [mergedOnly,setMergedOnly] = useState(true);

  async function run(dry:boolean){
    if (loading) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/admin/brands/delete-inactive', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ dry, mergedOnly }) });
      const json = await res.json();
      setResult(json);
    } catch(e){
      alert('Gagal: '+(e instanceof Error? e.message: String(e)));
    } finally { setLoading(false); }
  }

  async function handleDelete(){
    if (!result) {
      const ok = window.confirm('Belum preview. Preview dulu supaya tahu berapa yang akan dihapus.');
      if (!ok) return;
      return;
    }
    if (result.deleted === 0) {
      const ok2 = window.confirm(`Hapus ${result.matched} brand nonaktif sekarang? Tindakan ini permanen.`);
      if (!ok2) return;
    } else {
      return; // already applied
    }
    await run(false);
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[10px] text-slate-600"><input type="checkbox" checked={mergedOnly} onChange={e=>setMergedOnly(e.target.checked)} /> hanya merged</label>
        <button disabled={loading} onClick={()=>run(true)} className="px-2 py-1 bg-orange-500 text-white rounded text-xs disabled:opacity-50">{loading? '...':'Preview Hapus'}</button>
        <button disabled={loading || !result} onClick={handleDelete} className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50">Hapus Nonaktif</button>
      </div>
      {result && (
        <div className="text-[10px] text-slate-600 max-w-[240px]">
          {result.dry? 'Preview:' : 'Done:'} {result.matched} cocok, {result.deleted} dihapus. {result.mergedOnly? '(merged only)':''}
          {result.sample.length>0 && <div className="mt-1 max-h-24 overflow-auto font-mono">{result.sample.map((s,i)=>(<div key={i}>{s.code}{s.mergedInto? '->'+s.mergedInto:''}</div>))}</div>}
        </div>
      )}
    </div>
  );
}
