"use client";
import { useEffect, useMemo, useState } from "react";

type Brand = { code: string; name: string };
type AutomResult = { success: boolean; message?: string; [k:string]: any };

export default function GimboxAutomPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [productCode, setProductCode] = useState("");
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [rawJson, setRawJson] = useState("{}");
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<AutomResult | null>(null);
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkItems, setBulkItems] = useState<any[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const selectedCount = useMemo(()=> Object.values(bulkSelected).filter(v=>v).length, [bulkSelected]);
  const [allRunning, setAllRunning] = useState(false);
  const [allProgress, setAllProgress] = useState<{brandIndex:number; brandTotal:number; pushed:number; failed:number; skipped:number; currentBrand?:string}>({brandIndex:0, brandTotal:0, pushed:0, failed:0, skipped:0});
  const [allLogs, setAllLogs] = useState<Array<{brand:string; code:string; ok:boolean; msg?:string}>>([]);
  const stopRef = (typeof window !== 'undefined') ? (window as any).__vcgBulkAllStopRef || { stop:false } : { stop:false };
  if (typeof window !== 'undefined' && !(window as any).__vcgBulkAllStopRef) (window as any).__vcgBulkAllStopRef = stopRef;

  async function loadVariationsForBulk() {
    if (!bulkBrand) return;
    setBulkLoading(true); setBulkItems([]); setBulkSelected({});
    try {
      const res = await fetch(`/api/autom/vcgamers/variations?brand=${encodeURIComponent(bulkBrand)}`, { cache:'no-store' });
      const data = await res.json();
      const items = Array.isArray(data?.data) ? data.data : [];
      setBulkItems(items);
      const preset: Record<string, boolean> = {};
      for (const it of items) preset[it.providerProductCode] = true;
      setBulkSelected(preset);
    } catch (e:any) { setError(e.message); }
    finally { setBulkLoading(false); }
  }

  async function bulkPush() {
    if (!bulkBrand) return;
    setPosting(true); setError(""); setResult(null);
    try {
      const chosen = bulkItems.filter(it => bulkSelected[it.providerProductCode]);
      let ok = 0; let fail = 0; const logs: any[] = [];
      for (const it of chosen) {
        const body = {
          productCode: `${bulkBrand}_${it.providerProductCode}`.toUpperCase(),
          name: it.name,
          cost: it.cost,
          price: it.cost,
          brandKey: bulkBrand,
          raw: it,
        };
        const res = await fetch('/api/autom/vcgamers/post', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        const j = await res.json();
        if (j.success) ok++; else fail++;
        logs.push({ code: body.productCode, ok: j.success, msg: j.message });
      }
      setResult({ success: fail===0, bulk: true, ok, fail, total: chosen.length, logs });
    } catch (e:any) { setError(e.message); }
    finally { setPosting(false); }
  }

  async function bulkPushAllBrands() {
    if (allRunning) return;
    setAllRunning(true); stopRef.stop = false; setError(""); setResult(null);
    setAllProgress({ brandIndex:0, brandTotal:0, pushed:0, failed:0, skipped:0 });
    setAllLogs([]);
    try {
      // 1. Fetch all brands
      const brRes = await fetch('/api/autom/vcgamers/brands', { cache:'no-store' });
      const brData = await brRes.json();
      const brandList: Brand[] = Array.isArray(brData?.data) ? brData.data : [];
      setAllProgress(p=>({...p, brandTotal: brandList.length }));
      // 2. Iterate brands sequentially
      for (let i=0;i<brandList.length;i++) {
        if (stopRef.stop) break;
        const brand = brandList[i];
        setAllProgress(p=>({...p, brandIndex:i+1, currentBrand:brand.code }));
        // 2a load variations
        let variations: any[] = [];
        try {
          const vRes = await fetch(`/api/autom/vcgamers/variations?brand=${encodeURIComponent(brand.code)}`, { cache:'no-store' });
          const vData = await vRes.json();
          variations = Array.isArray(vData?.data) ? vData.data : [];
        } catch (e:any) {
          setAllLogs(l=>[...l.slice(-499), { brand: brand.code, code:'-', ok:false, msg: 'variations error: '+e.message }]);
          continue;
        }
        // 2b push each variation
        for (const it of variations) {
          if (stopRef.stop) break;
            const body = {
              productCode: `${brand.code}_${it.providerProductCode}`.toUpperCase(),
              name: it.name,
              cost: it.cost,
              price: it.cost,
              brandKey: brand.code,
              raw: it,
            };
            try {
              const res = await fetch('/api/autom/vcgamers/post', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
              const j = await res.json();
              setAllLogs(l=>[...l.slice(-499), { brand: brand.code, code: body.productCode, ok: j.success, msg: j.message }]);
              setAllProgress(p=>({...p, pushed: p.pushed + (j.success?1:0), failed: p.failed + (j.success?0:1) }));
            } catch (e:any) {
              setAllLogs(l=>[...l.slice(-499), { brand: brand.code, code: body.productCode, ok:false, msg:e.message }]);
              setAllProgress(p=>({...p, failed: p.failed + 1 }));
            }
        }
  }
  setResult((r: AutomResult | null): AutomResult => r || { success: true, bulkAll: true });
    } catch (e:any) {
      setError(e.message);
    } finally {
      setAllRunning(false);
    }
  }

  function stopBulkAll() { stopRef.stop = true; }

  async function loadBrands() {
    setLoadingBrands(true);
    try {
      const res = await fetch("/api/autom/vcgamers/brands", { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data?.data)) setBrands(data.data);
    } catch (e:any) {
      setError(e.message);
    } finally { setLoadingBrands(false); }
  }

  useEffect(() => { loadBrands(); }, []);

  const payload = useMemo(() => {
    const base: any = {
      productCode: productCode.trim(),
      name: name.trim(),
      cost: Number(cost) || 0,
      price: price.trim() ? Number(price) : undefined,
      brandKey: selectedBrand || undefined,
      category: category.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      isActive: active,
    };
    if (rawJson.trim()) {
      try { Object.assign(base, JSON.parse(rawJson)); } catch {}
    }
    Object.keys(base).forEach(k => base[k] === undefined && delete base[k]);
    return base;
  }, [productCode, name, cost, price, selectedBrand, category, imageUrl, active, rawJson]);

  const disabled = !payload.productCode || !payload.name || !(payload.cost > 0);

  async function handleSubmit() {
    setPosting(true); setResult(null); setError("");
    try {
      const res = await fetch("/api/autom/vcgamers/post", { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      setResult(data);
      if (!data?.success) setError(data?.message || 'Gagal');
    } catch (e:any) {
      setError(e.message);
    } finally { setPosting(false); }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Gimbox Autom • VCGamers Seller</h1>
      <p className="text-sm text-slate-600 mb-4">Buat / update listing produk ke marketplace VCGamers seller API.</p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Full Bulk Push Semua Brand</div>
              {allRunning && <span className="text-[11px] text-indigo-600 animate-pulse">Berjalan…</span>}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={bulkPushAllBrands} disabled={allRunning || posting} className="px-4 py-2 rounded bg-fuchsia-600 text-white text-xs disabled:opacity-50 flex items-center gap-2">
                {allRunning && <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {allRunning? 'Processing…' : 'Start All Brands'}
              </button>
              {allRunning && (
                <button type="button" onClick={stopBulkAll} className="px-3 py-2 rounded bg-red-600 text-white text-xs">Stop</button>
              )}
              <div className="text-[11px] text-slate-500">Brand {allProgress.brandIndex}/{allProgress.brandTotal} • OK {allProgress.pushed} • Fail {allProgress.failed}</div>
            </div>
            {allProgress.brandTotal>0 && (
              <div className="w-full h-2 bg-slate-200 rounded overflow-hidden mb-3">
                <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${(allProgress.brandIndex / allProgress.brandTotal)*100}%` }} />
              </div>
            )}
            {allLogs.length>0 && (
              <div className="max-h-48 overflow-auto border rounded text-[11px] bg-white">
                <table className="min-w-full">
                  <thead className="bg-slate-100 sticky top-0"><tr><th className="p-1 text-left">Brand</th><th className="p-1 text-left">Code</th><th className="p-1 text-left">Status</th><th className="p-1 text-left">Msg</th></tr></thead>
                  <tbody>
                    {allLogs.slice(-300).reverse().map((l,i)=>(
                      <tr key={i} className="border-t">
                        <td className="p-1 font-mono">{l.brand}</td>
                        <td className="p-1 font-mono">{l.code}</td>
                        <td className={`p-1 ${l.ok? 'text-emerald-600':'text-red-600'}`}>{l.ok? 'OK':'FAIL'}</td>
                        <td className="p-1 truncate max-w-[220px]" title={l.msg}>{l.msg?.slice(0,60)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Bulk Brand Variations → Seller</div>
              <div className="text-[11px] text-slate-500">Pilih brand & push massal</div>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col">
                <label className="text-xs text-slate-500 mb-1">Brand</label>
                <select value={bulkBrand} onChange={e=>setBulkBrand(e.target.value)} className="border rounded px-2 py-2 text-sm min-w-[160px]">
                  <option value="">Pilih brand…</option>
                  {brands.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              </div>
              <button type="button" disabled={!bulkBrand || bulkLoading} onClick={loadVariationsForBulk} className="px-3 py-2 rounded bg-slate-700 text-white text-xs disabled:opacity-40 flex items-center gap-2">
                {bulkLoading && <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {bulkLoading ? 'Memuat…' : 'Load Variations'}
              </button>
              <button type="button" disabled={!bulkBrand || bulkItems.length===0 || posting} onClick={bulkPush} className="px-3 py-2 rounded bg-emerald-600 text-white text-xs disabled:opacity-40 flex items-center gap-2">
                {posting && <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                Push {selectedCount>0? `(${selectedCount})`: ''}
              </button>
              {bulkItems.length>0 && (
                <button type="button" onClick={()=>{
                  const all = Object.values(bulkSelected).every(v=>v);
                  const next: Record<string,boolean> = {};
                  for (const it of bulkItems) next[it.providerProductCode] = !all;
                  setBulkSelected(next);
                }} className="px-3 py-2 rounded bg-indigo-500 text-white text-xs">{Object.values(bulkSelected).every(v=>v)? 'Unselect All':'Select All'}</button>
              )}
            </div>
            {bulkItems.length>0 && (
              <div className="mt-4 max-h-56 overflow-auto border rounded">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">#</th>
                      <th className="p-2">Code</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkItems.map((it,i)=>(
                      <tr key={it.providerProductCode} className="border-t">
                        <td className="p-1 align-top">
                          <input type="checkbox" checked={!!bulkSelected[it.providerProductCode]} onChange={(e)=>setBulkSelected(s=>({...s,[it.providerProductCode]: e.target.checked}))} className="h-3 w-3" />
                        </td>
                        <td className="p-1 font-mono">{it.providerProductCode}</td>
                        <td className="p-1">{it.name}</td>
                        <td className="p-1 text-right">{new Intl.NumberFormat('id-ID').format(it.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
              <div className="flex gap-2">
                <select value={selectedBrand} onChange={e=>setSelectedBrand(e.target.value)} className="flex-1 border rounded px-2 py-2 text-sm">
                  <option value="">(Opsional)</option>
                  {brands.map(b => <option key={b.code} value={b.code}>{b.name || b.code}</option>)}
                </select>
                <button type="button" onClick={loadBrands} className="px-2 py-2 border rounded text-xs bg-white" disabled={loadingBrands}>{loadingBrands? '...' : '↻'}</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Product Code *</label>
              <input value={productCode} onChange={e=>setProductCode(e.target.value)} placeholder="UNIK" className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nama Produk *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Jelas" className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cost (HPP) *</label>
              <input value={cost} onChange={e=>setCost(e.target.value)} placeholder="0" type="number" className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Price (Jual)</label>
              <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="auto gunakan cost" type="number" className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
              <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="mis. Diamonds" className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Image URL</label>
              <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..." className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2 mt-2 sm:col-span-2">
              <input id="active" type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="active" className="text-xs text-slate-600">Aktifkan produk</label>
              <button type="button" onClick={()=>setShowAdvanced(!showAdvanced)} className="ml-auto text-xs text-indigo-600 underline">{showAdvanced ? 'Sembunyikan Advanced' : 'Advanced JSON'}</button>
            </div>
          </div>
          {showAdvanced && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tambahan JSON (override field)</label>
              <textarea value={rawJson} onChange={e=>setRawJson(e.target.value)} rows={6} className="w-full font-mono text-xs border rounded p-2" />
            </div>
          )}
          <div className="flex gap-2">
            <button disabled={disabled || posting} onClick={handleSubmit} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {posting && <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {posting ? 'Mengirim…' : (result?.success ? 'Kirim Lagi' : 'Kirim ke Seller')}
            </button>
            {result && (
              <div className={`px-3 py-2 rounded text-xs border ${result.success ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{result.success ? 'Berhasil' : 'Gagal'}</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="border rounded p-3 bg-slate-50">
            <div className="font-medium text-sm mb-2">Preview Payload</div>
            <pre className="text-[11px] leading-relaxed overflow-auto max-h-80">{JSON.stringify(payload, null, 2)}</pre>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium text-sm mb-2">Hasil API</div>
            {result ? <pre className="text-[11px] leading-relaxed overflow-auto max-h-80">{JSON.stringify(result, null, 2)}</pre> : <div className="text-xs text-slate-400">Belum ada.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
