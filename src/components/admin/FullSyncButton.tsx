"use client";
import { useState } from 'react';

export default function FullSyncButton() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  async function runSync() {
    if (loading) return;
    setLoading(true);
    setProgress("Memulai sync...");
    try {
      const res = await fetch('/api/admin/providers/vcgamers/sync-stream?deactivateMissing=true', { method: 'GET', cache: 'no-store' });
      if (!res.body) throw new Error('Stream tidak tersedia');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      let productsUpserted = 0; let brandsTotal = 0; let brandCurrent = 0; let deactivated = 0; let active = 0; let startTs = Date.now();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const lines = raw.split('\n');
        raw = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'start') { startTs = Date.now(); setProgress('Mulai full sync...'); }
            if (evt.type === 'brands') { brandsTotal = evt.count; setProgress(`Total brand: ${brandsTotal}`); }
            if (evt.type === 'brand:start') { brandCurrent = evt.index; setProgress(`Brand ${brandCurrent}/${brandsTotal}: ${evt.key}`); }
            if (evt.type === 'brand:progress') { setProgress(`Brand ${brandCurrent}/${brandsTotal}: ${evt.canonical || evt.key} ${evt.processed}/${evt.totalProducts} (${evt.pct}%)`); }
            if (evt.type === 'brand:done') { setProgress(`Selesai brand ${evt.key} (${evt.products} produk)`); }
            if (evt.type === 'done') { productsUpserted = evt.productsUpserted; deactivated = evt.deactivated; active = evt.active; const dur = Math.round(evt.durationMs/1000); setProgress(`Selesai. Produk diproses: ${productsUpserted}. Aktif: ${active}. Nonaktif: ${deactivated}. Durasi: ${dur}s`); }
            if (evt.type === 'error') { setProgress(`Error: ${evt.message}`); }
          } catch {}
        }
      }
      // Refresh after short delay if finished
      if (productsUpserted || active) {
        setTimeout(()=>{ window.location.href = '/admin/products?synced=1'; }, 1200);
      } else {
        setLoading(false);
      }
    } catch (e:any) {
      setProgress(e.message || 'Terjadi kesalahan');
      setTimeout(()=> setLoading(false), 1600);
    }
  }
  return (
    <>
      <button type="button" onClick={runSync} disabled={loading} className="bg-orange-600 text-white px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed relative">
        {loading ? 'Sync Berjalan...' : 'Full Sync VCG'}
      </button>
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-xs mx-auto p-6 rounded-xl border bg-white shadow">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-700 font-medium text-center">Full Sync VCGamers<br/><span className="text-xs font-normal text-slate-500">Ringkasan progres tampil di bawah.</span></div>
              <div className="text-[11px] text-slate-600 min-h-[32px] text-center whitespace-pre-wrap leading-snug">{progress}</div>
              <button type="button" onClick={()=>{ if (!progress.startsWith('Selesai')) return; setLoading(false); }} className="text-xs text-slate-400 hover:text-slate-600">{progress.startsWith('Selesai') ? 'Tutup' : ' '}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
