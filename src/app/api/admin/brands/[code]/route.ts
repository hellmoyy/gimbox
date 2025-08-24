import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { copyImageToCDN, shouldCopyRemote } from '@/lib/imageStore';
import { ensureAdminRequest } from '@/lib/adminAuth';

// Use a permissive context type so Next.js accepts the handler while still
// gracefully handling the (rare) case where params might be a Promise.
export async function POST(req: NextRequest, context: { params: { code: string } } | any) {
  const raw = context?.params;
  const params: { code: string } = raw && typeof raw.then === 'function' ? await raw : raw;
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  const markupRaw = form.get('defaultMarkupPercent');
  const isActive = form.get('isActive') === 'on';
  let iconRaw = String(form.get('icon') || '').trim();
  const aliasesRaw = String(form.get('aliases') || '').trim();
  const providerRefsRaw = String(form.get('providerRefs') || '').trim();
  const developer = String(form.get('developer') || '').trim();
  const publisher = String(form.get('publisher') || '').trim();
  const featured = form.get('featured') === 'on';
  const newRelease = form.get('newRelease') === 'on';
  const voucher = form.get('voucher') === 'on';
  const pulsaTagihan = form.get('pulsaTagihan') === 'on';
  const entertainment = form.get('entertainment') === 'on';
  const doc: any = { updatedAt: new Date(), isActive };
  if (name) doc.name = name;
  if (iconRaw) {
    if (shouldCopyRemote(iconRaw)) {
      const copied = await copyImageToCDN(iconRaw, { folder: 'brands', slug: params.code });
      if (copied) iconRaw = copied;
    }
    doc.icon = iconRaw;
  } else if (iconRaw === '') {
    doc.icon = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';
  }
  if (markupRaw !== null && markupRaw !== undefined && String(markupRaw).trim() !== '') {
    doc.defaultMarkupPercent = Number(markupRaw);
  }
  if (aliasesRaw) {
    const aliases = Array.from(new Set(aliasesRaw.split(/[,\n]/).map(s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''))).values()).filter(Boolean);
    doc.aliases = aliases;
  } else if (aliasesRaw === '') {
    doc.aliases = [];
  }
  if (providerRefsRaw) {
    if (developer || developer === '') {
      doc.developer = developer || undefined;
    }
    if (publisher || publisher === '') {
      doc.publisher = publisher || undefined;
    }
    const providerRefs: Record<string,string[]> = {};
    for (const seg of providerRefsRaw.split(/[,;\n]/)) {
      const part = seg.trim(); if (!part) continue;
      const [prov, codesStr] = part.split(/:/,2);
      if (!prov || !codesStr) continue;
      const codes = Array.from(new Set(codesStr.split(/\|/).map(c=>c.trim()).filter(Boolean)));
      if (codes.length) providerRefs[prov.trim()] = codes;
    }
    doc.providerRefs = providerRefs;
  } else if (providerRefsRaw === '') {
    doc.providerRefs = {};
  }
  // Always set metadata & flags (outside providerRefs block)
  if (developer || developer === '') {
    doc.developer = developer || undefined;
  }
  if (publisher || publisher === '') {
    doc.publisher = publisher || undefined;
  }
  doc.featured = featured;
  doc.newRelease = newRelease;
  doc.voucher = voucher;
  doc.pulsaTagihan = pulsaTagihan;
  doc.entertainment = entertainment;
  try {
    const db = await getDb();
    await db.collection('brands').updateOne(
      { code: params.code },
      { $set: doc }
    );
  } catch (e:any) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.redirect(new URL('/admin/brands', req.url));
}
