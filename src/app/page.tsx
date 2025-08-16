import HeroCarousel from "../components/HeroCarousel";
import Section from "../components/Section";
import SmartImage from "../components/SmartImage";
import CategoryGrid from "../components/CategoryGrid";
import { getDb } from "../lib/mongodb";

async function getHomeProducts() {
  try {
    const db = await getDb();
    const featured = await db
      .collection("products")
      .find({
        isActive: { $ne: false },
        featured: true,
        name: { $nin: [null, ""] },
      })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, featured: 1 })
      .sort({ name: 1 })
      .toArray();

    const newRelease = await db
      .collection("products")
      .find({ isActive: { $ne: false }, newRelease: true, name: { $nin: [null, ""] } })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, newRelease: 1 })
      .sort({ name: 1 })
      .toArray();

    const voucher = await db
      .collection("products")
      .find({ isActive: { $ne: false }, voucher: true, name: { $nin: [null, ""] } })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, voucher: 1 })
      .sort({ name: 1 })
      .toArray();

    const pulsaTagihan = await db
      .collection("products")
      .find({ isActive: { $ne: false }, pulsaTagihan: true, name: { $nin: [null, ""] } })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, pulsaTagihan: 1 })
      .sort({ name: 1 })
      .toArray();

    const entertainment = await db
      .collection("products")
      .find({ isActive: { $ne: false }, entertainment: true, name: { $nin: [null, ""] } })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, entertainment: 1 })
      .sort({ name: 1 })
      .toArray();

  const all = await db
      .collection("products")
      .find({
        isActive: { $ne: false },
        name: { $nin: [null, ""] },
      })
  .project({ _id: 0, name: 1, code: 1, icon: 1, category: 1, featured: 1 })
      .sort({ name: 1 })
      .toArray();

  return { featured, newRelease, voucher, pulsaTagihan, entertainment, all } as any;
  } catch (e) {
    console.warn("[home] Using local data due to DB error:", (e as any)?.message || e);
    // No dummy fallback per request; return empty arrays
    return { featured: [], newRelease: [], voucher: [], pulsaTagihan: [], entertainment: [], all: [] } as any;
  }
}

export default async function Home() {
  const { featured, newRelease, voucher, pulsaTagihan, entertainment, all } = await getHomeProducts();
  return (
    <main className="min-h-screen pb-24">
      <HeroCarousel />

      {/* Horizontal scrollable pill buttons under banner */}
      <div className="mx-auto max-w-6xl px-4 mt-2">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
          {[
            { label: "Populer", icon: "🔥", href: "#populer" },
            { label: "Baru Rilis", icon: "✨", href: "#baru-rilis" },
            { label: "Voucher", icon: "🎟️", href: "#voucher" },
            { label: "Pulsa & Tagihan", icon: "📱", href: "#pulsa-tagihan" },
            { label: "Entertainment", icon: "🎬", href: "#entertainment" },
            { label: "Semua Produk", icon: "🛍️", href: "#semua-produk" },
      ].map(({ label, icon, href }) => (
            <a
              key={label}
        href={href}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 bg-[#fefefe] text-slate-800 text-sm font-medium shadow-sm hover:shadow-md hover:border-slate-400 transition whitespace-nowrap"
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>

  <Section id="populer" title="Populer" icon={<span>🔥</span>}>
        {featured.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada produk featured.</div>
        ) : (
          <CategoryGrid items={featured as any} showLimit={8} />
        )}
      </Section>

      <Section id="baru-rilis" title="Baru Rilis" icon={<span>✨</span>}>
        {newRelease.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada produk baru rilis.</div>
        ) : (
          <CategoryGrid items={newRelease as any} showLimit={8} />
        )}
      </Section>

      <Section id="voucher" title="Voucher" icon={<span>🎟️</span>}>
        {voucher.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada produk voucher.</div>
        ) : (
          <CategoryGrid items={voucher as any} showLimit={8} />
        )}
      </Section>

      <Section id="pulsa-tagihan" title="Pulsa & Tagihan" icon={<span>📱</span>}>
        {pulsaTagihan.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada produk pulsa & tagihan.</div>
        ) : (
          <CategoryGrid items={pulsaTagihan as any} showLimit={8} />
        )}
      </Section>

      <Section id="entertainment" title="Entertainment" icon={<span>🎬</span>}>
        {entertainment.length === 0 ? (
          <div className="text-sm text-slate-500">Belum ada produk entertainment.</div>
        ) : (
          <CategoryGrid items={entertainment as any} showLimit={8} />
        )}
      </Section>

  <Section id="semua-produk" title="Semua Produk" icon={<span>🛍️</span>}>
        {all.length === 0 ? (
          <div className="text-sm text-slate-500 mt-2">Belum ada data game.</div>
        ) : (
          <CategoryGrid items={all as any} showLimit={8} />
        )}
      </Section>

    </main>
  );
}
