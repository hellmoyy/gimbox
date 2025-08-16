import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = String(token.email).toLowerCase();
    const db = await getDb();
    const col = db.collection("wallets");
    let doc = await col.findOne<{ email: string; balance: number }>({ email });
    if (!doc) {
      doc = { email, balance: 0 } as any;
      await col.insertOne({ ...doc, createdAt: new Date(), updatedAt: new Date() });
    }
    return NextResponse.json({ success: true, balance: Number((doc as any).balance || 0) });
  } catch (e: any) {
    const message = e?.name === "MongoServerSelectionError" ? "Database unavailable" : e?.message || "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
