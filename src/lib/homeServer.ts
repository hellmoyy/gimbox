import { getDb } from '@/lib/mongodb';

export type HomeBrand = {
  name: string;
  code: string;
  icon?: string;
  featured?: boolean;
  newRelease?: boolean;
  voucher?: boolean;
  pulsaTagihan?: boolean;
  entertainment?: boolean;
  featuredOrder?: number;
  newReleaseOrder?: number;
  voucherOrder?: number;
  pulsaTagihanOrder?: number;
  entertainmentOrder?: number;
};

export type HomeBrandGroups = {
  featured: HomeBrand[];
  newRelease: HomeBrand[];
  voucher: HomeBrand[];
  pulsaTagihan: HomeBrand[];
  entertainment: HomeBrand[];
  all: HomeBrand[];
};

export async function fetchHomeBrands(): Promise<HomeBrandGroups> {
  const db = await getDb();
  const col = db.collection('brands');
  const base: any = { isActive: { $ne: false }, name: { $nin: [null, ''] } };
  const proj = { projection: { _id: 0, name: 1, code: 1, icon: 1, featured: 1, newRelease: 1, voucher: 1, pulsaTagihan: 1, entertainment: 1, featuredOrder: 1, newReleaseOrder: 1, voucherOrder: 1, pulsaTagihanOrder: 1, entertainmentOrder: 1 } } as any;
  const [featuredRaw, newReleaseRaw, voucherRaw, pulsaTagihanRaw, entertainmentRaw, allRaw] = await Promise.all([
    col.find({ ...base, featured: true }, proj).sort({ name: 1 }).toArray(),
    col.find({ ...base, newRelease: true }, proj).sort({ name: 1 }).toArray(),
    col.find({ ...base, voucher: true }, proj).sort({ name: 1 }).toArray(),
    col.find({ ...base, pulsaTagihan: true }, proj).sort({ name: 1 }).toArray(),
    col.find({ ...base, entertainment: true }, proj).sort({ name: 1 }).toArray(),
    col.find(base, proj).sort({ name: 1 }).limit(120).toArray(),
  ]);
  function sortBy(list: any[], field: string) {
    return list.sort((a: any, b: any) => {
      const av = typeof a[field] === 'number' ? a[field] : 999999;
      const bv = typeof b[field] === 'number' ? b[field] : 999999;
      if (av !== bv) return av - bv;
      return a.name.localeCompare(b.name);
    });
  }
  return {
    featured: sortBy(featuredRaw, 'featuredOrder') as HomeBrand[],
    newRelease: sortBy(newReleaseRaw, 'newReleaseOrder') as HomeBrand[],
    voucher: sortBy(voucherRaw, 'voucherOrder') as HomeBrand[],
    pulsaTagihan: sortBy(pulsaTagihanRaw, 'pulsaTagihanOrder') as HomeBrand[],
    entertainment: sortBy(entertainmentRaw, 'entertainmentOrder') as HomeBrand[],
  all: allRaw as unknown as HomeBrand[],
  };
}

export type HomeCategory = { name: string; code: string; icon?: string; sort?: number };

export async function fetchCategories(): Promise<HomeCategory[]> {
  const db = await getDb();
  const cats = await db
    .collection('categories')
    .find({ isActive: { $ne: false } })
    .project({ _id: 0, name: 1, code: 1, icon: 1, sort: 1 })
    .sort({ sort: 1, name: 1 })
    .toArray();
  return cats as HomeCategory[];
}
