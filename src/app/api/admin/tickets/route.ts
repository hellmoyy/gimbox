import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    if (!ensureAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "").toLowerCase();
    const match: any = {};
    if (status === "open" || status === "closed" || status === "pending") match.status = status;
    const db = await getDb();
    const rows = await db
      .collection("tickets")
      .find(match, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray();
    return NextResponse.json({ success: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
