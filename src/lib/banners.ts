import { getDb } from "./mongodb";

export type Banner = {
  _id?: any;
  image: string; // Path relative under /public
  link?: string; // Optional click target URL
  sort?: number;
  isActive?: boolean;
  variants?: string[]; // Optional responsive variants (md, etc.)
};

// No defaults for images; admin should upload. Keep empty to avoid broken UI.
export const defaultBanners: Banner[] = [];

export async function getBanners(onlyActive = true): Promise<Banner[]> {
  try {
    const db = await getDb();
    const filter: any = {};
    if (onlyActive) filter.isActive = { $ne: false };
  const docs = await db
      .collection("banners")
      .find(filter)
  .project({ _id: 0, image: 1, link: 1, sort: 1, isActive: 1, variants: 1 })
      .sort({ sort: 1, _id: 1 })
      .toArray();
  const cleaned = (docs as any[]).filter((d) => typeof d.image === "string" && d.image.trim() !== "");
  return cleaned as unknown as Banner[];
  } catch (e) {
    return [];
  }
}
