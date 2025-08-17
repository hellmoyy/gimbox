import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const db = await getDb();
    const row = await db.collection("tickets").findOne({ ticketId: params.ticketId, email }, { projection: { _id: 0 } });
    if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ticket: row });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const body = await req.json();
    const message = String(body?.message || "").trim();
    if (!message) return NextResponse.json({ success: false, error: "Pesan wajib." }, { status: 400 });
    const now = new Date();
    const db = await getDb();
    const res = await db.collection("tickets").updateOne(
      { ticketId: params.ticketId, email },
      { $push: { messages: { author: "user", email, text: message, createdAt: now } }, $set: { updatedAt: now, status: "open" } }
    );
    if (!res.matchedCount) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
