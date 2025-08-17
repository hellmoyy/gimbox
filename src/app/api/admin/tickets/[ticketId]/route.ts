import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    if (!ensureAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ticketId } = await params;
    const db = await getDb();
  const row = await db.collection("tickets").findOne({ ticketId }, { projection: { _id: 0 } });
    if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ticket: row });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    if (!ensureAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ticketId } = await params;
    const body = await req.json();
    const message = String(body?.message || "").trim();
    const status = String(body?.status || "").toLowerCase();
    const validStatus = ["open", "pending", "closed"];
    if (!message && !validStatus.includes(status)) return NextResponse.json({ success: false, error: "Tidak ada perubahan." }, { status: 400 });
    const now = new Date();
    const db = await getDb();
    const update: any = { $set: { updatedAt: now } };
    if (message) {
      update.$push = { messages: { author: "admin", text: message, createdAt: now } };
    }
    if (validStatus.includes(status)) {
      update.$set.status = status;
    }
  const res = await db.collection("tickets").updateOne({ ticketId }, update);
    if (!res.matchedCount) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
