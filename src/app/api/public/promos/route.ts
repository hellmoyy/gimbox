import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const rows = await db.collection('promos')
      .find({ $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }] })
      .sort({ createdAt: -1 })
      .project({ title: 1, desc: 1, tag: 1, until: 1, image: 1, url: 1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ success: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, items: [], error: e?.message || 'Error' }, { status: 500 });
  }
}
