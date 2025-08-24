import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ensureAdminRequest } from '@/lib/adminAuth';

// Simple duplicate merge endpoint based on providerRefs lowercase collisions (same logic as script subset)
export const dynamic = 'force-dynamic';

type MergeRecord = { provider: string; ref: string; canonical: string; dupes: string[]; productsChanged: number };

function pickCanonical(list: any[]) {
  if (list.length === 1) return list[0];
  return list.sort((a,b)=>{
    function score(x:any){
      let s=0; if (x.icon) s++; if (x.developer) s++; if (x.publisher) s++; if (x.featured||x.newRelease||x.voucher||x.pulsaTagihan||x.entertainment) s++; s+= (x.createdAt? -new Date(x.createdAt).getTime()/1e13:0); return -s; }
    return score(a)-score(b);
  })[0];
}

function uniq(arr: any[]){ return Array.from(new Set(arr.filter(Boolean))); }

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = await getDb();
  const body = await req.json().catch(()=>({})) as any;
  const dry = body?.dry === true; // allow test run
  const providerFilter = body?.provider ? String(body.provider) : null;
  const limit = typeof body?.limit === 'number' ? body.limit : 0;
  const mode: 'providerRef' | 'codeCase' | 'nameNorm' = body?.mode === 'codeCase' ? 'codeCase' : body?.mode === 'nameNorm' ? 'nameNorm' : 'providerRef';

  const brands = await db.collection('brands').find({}).toArray();
  const merges: MergeRecord[] = [];
  let groupsScanned = 0;

  async function buildAndProcessGroups(groupMap: Record<string, any[]>, refBuilder: (key:string, list:any[])=>{prov:string;ref:string}) {
    for (const key of Object.keys(groupMap)) {
      const list = groupMap[key];
      if (list.length < 2) continue;
      groupsScanned++;
      if (limit && merges.length >= limit) break;
      const canonical = pickCanonical(list);
      const dupes = list.filter(x=>x._id.toString()!==canonical._id.toString());
      if (!dupes.length) continue;
      const mergedAliases = uniq([...(canonical.aliases||[]), ...dupes.flatMap(d=>d.aliases||[])]);
      const mergedRefs: Record<string,string[]> = {};
      for (const br of [canonical, ...dupes]) {
        for (const pv of Object.keys(br.providerRefs||{})) {
          mergedRefs[pv] ||= []; mergedRefs[pv].push(...(br.providerRefs[pv]||[]).map((r:string)=>r.toLowerCase()));
        }
      }
      for (const pv of Object.keys(mergedRefs)) mergedRefs[pv] = uniq(mergedRefs[pv]);
      const setUpdate: Record<string,any> = { aliases: mergedAliases, providerRefs: mergedRefs, updatedAt: new Date() };
      for (const field of ['icon','developer','publisher','featured','newRelease','voucher','pulsaTagihan','entertainment','featuredOrder','newReleaseOrder','voucherOrder','pulsaTagihanOrder','entertainmentOrder']) {
        if (canonical[field] == null) {
          const donor = dupes.find(d=>d[field]!=null);
          if (donor) setUpdate[field] = donor[field];
        }
      }
      // Repoint products from dupes -> canonical
      const prodCursor = db.collection('products').find({ brandKey: { $in: dupes.map(d=>d.code) } }).project({ _id:1, code:1, brandKey:1 });
      let productsChanged = 0;
      while (await prodCursor.hasNext()) {
        const p = await prodCursor.next(); if (!p) continue;
        const oldBrandKey: string | undefined = p.brandKey; if (!oldBrandKey || oldBrandKey === canonical.code) continue;
        if (typeof p.code !== 'string' || !p.code.startsWith(oldBrandKey+'-')) continue;
        const suffix = p.code.slice(oldBrandKey.length+1);
        const newCode = `${canonical.code}-${suffix}`.toLowerCase();
        const exists = await db.collection('products').findOne({ code: newCode }); if (exists) continue;
        if (!dry) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { code: newCode, brandKey: canonical.code, gameCode: canonical.code, category: canonical.code, updatedAt: new Date() } });
        }
        productsChanged++;
      }
      if (!dry) {
        await db.collection('brands').updateOne({ _id: canonical._id }, { $set: setUpdate });
        await db.collection('brands').updateMany({ _id: { $in: dupes.map(d=>d._id) } }, { $set: { isActive:false, mergedInto: canonical.code, updatedAt: new Date() } });
      }
      const refInfo = refBuilder(key, list);
      merges.push({ provider: refInfo.prov, ref: refInfo.ref, canonical: canonical.code, dupes: dupes.map(d=>d.code), productsChanged });
    }
  }

  if (mode === 'providerRef') {
    const providerIndex: Record<string, Record<string, any[]>> = {};
    for (const b of brands) {
      for (const prov of Object.keys(b.providerRefs||{})) {
        if (providerFilter && prov !== providerFilter) continue;
        for (const ref of b.providerRefs[prov]||[]) {
          const lc = String(ref).toLowerCase();
          providerIndex[prov] ||= {}; providerIndex[prov][lc] ||= []; providerIndex[prov][lc].push(b);
        }
      }
    }
    for (const prov of Object.keys(providerIndex)) {
      await buildAndProcessGroups(providerIndex[prov], (key)=>({ prov, ref: key }));
    }
  } else if (mode === 'codeCase') {
    const map: Record<string, any[]> = {};
    for (const b of brands) {
      const key = (b.code||'').toLowerCase();
      map[key] ||= []; map[key].push(b);
    }
    await buildAndProcessGroups(map, (key, list)=>({ prov: 'codeCase', ref: key }));
  } else if (mode === 'nameNorm') {
    const map: Record<string, any[]> = {};
    const norm = (v:string)=> (v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    for (const b of brands) {
      const key = norm(b.name||b.code||'');
      map[key] ||= []; map[key].push(b);
    }
    await buildAndProcessGroups(map, (key)=>({ prov: 'nameNorm', ref: key }));
  }

  return NextResponse.json({ ok: true, dry, mode, merges, mergeGroups: merges.length, groupsScanned });
}
