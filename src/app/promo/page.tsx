import { getDb } from "../../lib/mongodb";

export default async function PromoPage() {
  let promos: Array<{ _id: string; title: string; desc?: string; tag?: string; until?: string; image?: string; url?: string; isActive?: boolean; createdAt?: Date }> = [];
  try {
    const db = await getDb();
    const rows = await db
      .collection("promos")
      .find({ $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }] })
      .sort({ createdAt: -1 })
  .project({ title: 1, desc: 1, tag: 1, until: 1, image: 1, url: 1 })
      .toArray();
    promos = rows as any;
  } catch {
    // Leave promos empty; show gentle empty state
  }
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-4 mt-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Promo</h1>
        {promos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white/90 p-6 text-center text-slate-600">
            Belum ada promo aktif saat ini.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {promos.map((p: any) => (
              <li key={p._id} className="rounded-xl overflow-hidden border border-slate-100 bg-white/90 shadow-sm">
                <div className="relative h-36 sm:h-44">
                  <div
                    className={`absolute inset-0 ${p.image ? "" : "bg-slate-200"}`}
                    style={
                      p.image
                        ? { backgroundImage: `url(${p.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : undefined
                    }
                  />
                  {p.url ? (
                    <a href={p.url} className="absolute inset-0 z-10" aria-label={p.title || "Promo"} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
