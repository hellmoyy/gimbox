import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token?.email) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
    const db = await getDb();
    // Assume wallet_transactions collection with documents: { email, amount, type, note, createdAt }
    const query = { email };
    const total = await db.collection('wallet_transactions').countDocuments(query);
    const raw = await db.collection('wallet_transactions')
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .project({ _id: 0, email: 0 })
      .toArray();
    // Normalize date field expected by client (provide 'date' alias for createdAt)
    const items = raw.map((it: any) => ({ ...it, date: it.date || it.createdAt }));
    return NextResponse.json({ success: true, page, pageSize, total, items });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Error' }, { status: 500 });
  }
}
