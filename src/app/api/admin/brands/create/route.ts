import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { copyImageToCDN, shouldCopyRemote } from '@/lib/imageStore';
import { ensureAdminRequest } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const codeRaw = String(form.get('code') || '').trim();
  const code = codeRaw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const name = String(form.get('name') || '').trim() || code;
  const defaultMarkupPercent = form.get('defaultMarkupPercent');
  let icon = String(form.get('icon') || '').trim();
  const isActive = form.get('isActive') === 'on';
  const aliasesRaw = String(form.get('aliases') || '').trim();
  const providerRefsRaw = String(form.get('providerRefs') || '').trim();
  const developer = String(form.get('developer') || '').trim();
  const publisher = String(form.get('publisher') || '').trim();
  // Category flags (brand-level grouping for home sections)
  const featured = form.get('featured') === 'on';
  const newRelease = form.get('newRelease') === 'on';
  const voucher = form.get('voucher') === 'on';
  const pulsaTagihan = form.get('pulsaTagihan') === 'on';
  const entertainment = form.get('entertainment') === 'on';
  const featuredOrderRaw = form.get('featuredOrder');
  const newReleaseOrderRaw = form.get('newReleaseOrder');
  const voucherOrderRaw = form.get('voucherOrder');
  const pulsaTagihanOrderRaw = form.get('pulsaTagihanOrder');
  const entertainmentOrderRaw = form.get('entertainmentOrder');
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });
  const aliases = aliasesRaw ? Array.from(new Set(aliasesRaw.split(/[,\n]/).map(s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''))).values()).filter(Boolean) : [];
  let providerRefs: Record<string,string[]> | undefined = undefined;
  if (providerRefsRaw) {
    // Format: provider:code1|code2;provider2:codeA
    providerRefs = {};
    for (const seg of providerRefsRaw.split(/[,;\n]/)) {
      const part = seg.trim(); if (!part) continue;
      const [prov, codesStr] = part.split(/:/,2);
      if (!prov || !codesStr) continue;
      const codes = Array.from(new Set(codesStr.split(/\|/).map(c=>c.trim()).filter(Boolean)));
      if (codes.length) providerRefs[prov.trim()] = codes;
    }
  }
  const placeholder = process.env.PRODUCT_PLACEHOLDER_URL || 'https://cdn.gimbox.id/placeholder.webp';
  if (icon && shouldCopyRemote(icon)) {
    const copied = await copyImageToCDN(icon, { folder: 'brands', slug: code });
    if (copied) icon = copied;
  }
  const doc: any = {
    code,
    name,
    icon: icon || placeholder,
    defaultMarkupPercent: defaultMarkupPercent ? Number(defaultMarkupPercent) : 1,
    isActive,
    provider: 'manual',
    aliases: aliases.length ? aliases : undefined,
    providerRefs: providerRefs && Object.keys(providerRefs).length ? providerRefs : undefined,
  developer: developer || undefined,
  publisher: publisher || undefined,
  featured,
  newRelease,
  voucher,
  pulsaTagihan,
  entertainment,
  featuredOrder: featuredOrderRaw !== null && featuredOrderRaw !== undefined && String(featuredOrderRaw).trim() !== '' ? Number(featuredOrderRaw) : undefined,
  newReleaseOrder: newReleaseOrderRaw !== null && newReleaseOrderRaw !== undefined && String(newReleaseOrderRaw).trim() !== '' ? Number(newReleaseOrderRaw) : undefined,
  voucherOrder: voucherOrderRaw !== null && voucherOrderRaw !== undefined && String(voucherOrderRaw).trim() !== '' ? Number(voucherOrderRaw) : undefined,
  pulsaTagihanOrder: pulsaTagihanOrderRaw !== null && pulsaTagihanOrderRaw !== undefined && String(pulsaTagihanOrderRaw).trim() !== '' ? Number(pulsaTagihanOrderRaw) : undefined,
  entertainmentOrder: entertainmentOrderRaw !== null && entertainmentOrderRaw !== undefined && String(entertainmentOrderRaw).trim() !== '' ? Number(entertainmentOrderRaw) : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    const db = await getDb();
    // Pre-check existing brand with same code (already lowercased) to give friendly error
    const dup = await db.collection('brands').findOne({ code });
    if (dup) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    }
    await db.collection('brands').insertOne(doc);
  } catch (e:any) {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
  return NextResponse.redirect(new URL('/admin/brands', req.url));
}
