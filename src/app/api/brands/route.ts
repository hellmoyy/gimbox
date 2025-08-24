import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const items = await db.collection('brands')
      .find({ isActive: { $ne: false } })
      .project({ _id: 0, name: 1, code: 1, icon: 1, featured: 1, newRelease: 1 })
      .sort({ featured: -1, name: 1 })
      .limit(500)
      .toArray();
    return Response.json({ data: items });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
}
