import Link from 'next/link';
import { getDb } from '@/lib/mongodb';
import { headers } from 'next/headers';
import FullSyncButton from '@/components/admin/FullSyncButton';
import MergeDuplicatesButton from '@/components/admin/MergeDuplicatesButton';
import DeleteInactiveBrandsButton from '@/components/admin/DeleteInactiveBrandsButton';

export const dynamic = 'force-dynamic';

type PaginatedBrands = { items: any[]; total: number; page: number; pageSize: number };

async function fetchBrands(page: number, pageSize: number, q?: string): Promise<PaginatedBrands> {
  const db = await getDb();
  const filter: any = {};
  if (q) {
    const regex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, '.'), 'i');
    filter.$or = [
      { name: regex },
      { code: regex },
      { aliases: regex },
    ];
  }
  const total = await db.collection('brands').countDocuments(filter);
  const items = await db.collection('brands')
    .find(filter)
    .sort({ sort: 1, name: 1, _id: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return { items, total, page, pageSize };
}

export default async function BrandsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const hdrs = headers(); // placeholder (middleware handles auth)
  void hdrs;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp?.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp?.pageSize) || 25));
  const q = (sp?.q || '').trim();
  const cat = (sp?.cat || '').trim(); // category filter via flags
  let data: PaginatedBrands | null = null;
  try {
    // Build filter wrapper with category flag if needed
    const db = await getDb();
    const filter: any = {};
    if (q) {
      const regex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, '.'), 'i');
      filter.$or = [ { name: regex }, { code: regex }, { aliases: regex } ];
    }
    if (cat) {
      const flagMap: Record<string,string> = { populer: 'featured', baru: 'newRelease', voucher: 'voucher', pulsa: 'pulsaTagihan', entertainment: 'entertainment' };
      if (flagMap[cat]) {
        filter[flagMap[cat]] = true;
      } else if (cat === 'no-flag') {
        filter.$and = [ { featured: { $ne: true } }, { newRelease: { $ne: true } }, { voucher: { $ne: true } }, { pulsaTagihan: { $ne: true } }, { entertainment: { $ne: true } } ];
      }
    }
    const total = await db.collection('brands').countDocuments(filter);
    const items = await db.collection('brands')
      .find(filter)
      .sort({ sort: 1, name: 1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    data = { items, total, page, pageSize };
  } catch {
    data = { items: [], total: 0, page, pageSize };
  }
  const { items: brands, total } = data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  function qp(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (pageSize !== 25) params.set('pageSize', String(pageSize));
    if (q) params.set('q', q);
    if (cat) params.set('cat', cat);
    const qs = params.toString();
    return '/admin/brands' + (qs ? `?${qs}` : '');
  }

  const pagesToShow: number[] = [];
  const windowSize = 5;
  let startWin = Math.max(1, page - Math.floor(windowSize / 2));
  let endWin = startWin + windowSize - 1;
  if (endWin > pageCount) {
    endWin = pageCount;
    startWin = Math.max(1, endWin - windowSize + 1);
  }
  for (let i = startWin; i <= endWin; i++) pagesToShow.push(i);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Brands <span className="text-sm font-normal text-slate-500">(Total: {total})</span></h1>
        <div className="flex items-center gap-2 flex-wrap">
          <form method="get" className="flex items-center gap-1 flex-wrap">
            <input type="hidden" name="page" value="1" />
            {pageSize !== 25 && <input type="hidden" name="pageSize" value={pageSize} />}
            <input name="q" defaultValue={q} placeholder="Cari nama / code / alias" className="border rounded px-2 py-1 text-xs bg-[#fefefe]" />
            <select name="cat" defaultValue={cat} className="border rounded px-2 py-1 text-xs bg-[#fefefe]">
              <option value="">Semua Flag</option>
              <option value="populer">Populer</option>
              <option value="baru">Baru Rilis</option>
              <option value="voucher">Voucher</option>
              <option value="pulsa">Pulsa & Tagihan</option>
              <option value="entertainment">Entertainment</option>
              <option value="no-flag">Tanpa Flag</option>
            </select>
            <button className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300" type="submit">Filter</button>
            {(q || cat) && <Link href="/admin/brands" className="text-xs text-slate-500 ml-1">Reset</Link>}
          </form>
          <Link href="/admin/brands/new" className="bg-green-600 text-white px-3 py-2 rounded">Tambah Brand</Link>
          <Link href="/admin/products/sync" className="bg-indigo-600 text-white px-3 py-2 rounded">Sync Harga VCG</Link>
          <FullSyncButton />
          <MergeDuplicatesButton />
          <DeleteInactiveBrandsButton />
        </div>
      </div>
      <div className="mb-3 text-xs text-slate-600 flex flex-wrap items-center gap-3">
        <span>Menampilkan {start}-{end} dari {total}</span>
        <form method="get" className="flex items-center gap-1">
          <input type="hidden" name="page" value="1" />
          {q && <input type="hidden" name="q" value={q} />}
          <select name="pageSize" defaultValue={pageSize} className="border rounded px-2 py-1 text-xs bg-[#fefefe]">
            {[10,25,50,100].map(ps => <option key={ps} value={ps}>{ps}/hal</option>)}
          </select>
          <button className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300" type="submit">Ubah</button>
        </form>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-900">
              <th className="p-3">Icon</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Code</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Developer</th>
              <th className="p-3">Publisher</th>
              <th className="p-3">Markup%</th>
              <th className="p-3">Flags</th>
              <th className="p-3">Urutan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {brands.map(b => (
              <tr key={b._id} className="border-t bg-[#fefefe]">
                <td className="p-3">
                  {b.icon ? (
                    <img src={b.icon} alt="" className="w-8 h-8 object-cover rounded border" />
                  ) : (
                    <div className="w-8 h-8 rounded border bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">—</div>
                  )}
                </td>
                <td className="p-3 max-w-[240px]"><div className="truncate" title={b.name}>{b.name}</div></td>
                <td className="p-3 font-mono text-xs">{b.code}</td>
                <td className="p-3 text-xs">{b.provider || '-'}</td>
                <td className="p-3 text-xs max-w-[160px] truncate" title={b.developer}>{b.developer || '-'}</td>
                <td className="p-3 text-xs max-w-[160px] truncate" title={b.publisher}>{b.publisher || '-'}</td>
                <td className="p-3 text-xs">{typeof b.defaultMarkupPercent === 'number' ? b.defaultMarkupPercent : '-'}</td>
                <td className="p-3 text-[10px] leading-4 max-w-[120px]">
                  <div className="flex flex-wrap gap-1">
                    {b.featured && <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 rounded">Populer</span>}
                    {b.newRelease && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">Baru</span>}
                    {b.voucher && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded">Voucher</span>}
                    {b.pulsaTagihan && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 rounded">Pulsa</span>}
                    {b.entertainment && <span className="px-1.5 py-0.5 bg-fuchsia-500/10 text-fuchsia-600 rounded">Entertain</span>}
                  </div>
                </td>
                <td className="p-3 text-[10px] leading-4">
                  <div className="flex flex-wrap gap-1">
                    {b.featured && typeof b.featuredOrder === 'number' && <span className="px-1 py-0.5 bg-slate-100 rounded">P:{b.featuredOrder}</span>}
                    {b.newRelease && typeof b.newReleaseOrder === 'number' && <span className="px-1 py-0.5 bg-slate-100 rounded">B:{b.newReleaseOrder}</span>}
                    {b.voucher && typeof b.voucherOrder === 'number' && <span className="px-1 py-0.5 bg-slate-100 rounded">V:{b.voucherOrder}</span>}
                    {b.pulsaTagihan && typeof b.pulsaTagihanOrder === 'number' && <span className="px-1 py-0.5 bg-slate-100 rounded">PL:{b.pulsaTagihanOrder}</span>}
                    {b.entertainment && typeof b.entertainmentOrder === 'number' && <span className="px-1 py-0.5 bg-slate-100 rounded">E:{b.entertainmentOrder}</span>}
                    {!b.featured && !b.newRelease && !b.voucher && !b.pulsaTagihan && !b.entertainment && <span className="text-slate-400">-</span>}
                  </div>
                </td>
                <td className="p-3 text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs ${b.isActive === false ? 'bg-red-600/10 text-red-700' : 'bg-green-600/10 text-green-700'}`}>{b.isActive === false ? 'Nonaktif' : 'Aktif'}</span>
                </td>
                <td className="p-3 text-xs">{b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : '-'}</td>
                <td className="p-3 text-xs">
                  <Link href={`/admin/brands/${b.code}`} className="text-indigo-600 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-slate-500">Belum ada brand</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Link aria-disabled={page===1} className={`px-2 py-1 rounded text-xs border ${page===1? 'opacity-40 cursor-default':'hover:bg-slate-100'}`} href={page===1? qp(1): qp(page-1)}>Prev</Link>
          {startWin > 1 && <span className="text-xs px-1">...</span>}
          {pagesToShow.map(p => (
            <Link key={p} href={qp(p)} className={`px-2 py-1 rounded text-xs border ${p===page? 'bg-indigo-600 text-white border-indigo-600':'hover:bg-slate-100'}`}>{p}</Link>
          ))}
          {endWin < pageCount && <span className="text-xs px-1">...</span>}
          <Link aria-disabled={page===pageCount} className={`px-2 py-1 rounded text-xs border ${page===pageCount? 'opacity-40 cursor-default':'hover:bg-slate-100'}`} href={page===pageCount? qp(pageCount): qp(page+1)}>Next</Link>
        </div>
      )}
    </div>
  );
}
