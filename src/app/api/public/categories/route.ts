import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const items = await db
      .collection('categories')
      .find({ isActive: { $ne: false } })
      .project({ _id: 0, name: 1, code: 1, icon: 1, sort: 1 })
      .sort({ sort: 1, name: 1 })
      .toArray();
    return NextResponse.json({ success: true, categories: items });
  } catch (e: any) {
    return NextResponse.json({ success: false, categories: [], error: e?.message || 'Error' }, { status: 500 });
  }
}
