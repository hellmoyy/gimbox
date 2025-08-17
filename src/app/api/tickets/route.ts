import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

function genTicketId() {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const ds = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `T${ds}-${rnd}`;
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const db = await getDb();
    const rows = await db
      .collection("tickets")
      .find({ email }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ success: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
    const body = await req.json();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const orderId = body?.orderId ? String(body.orderId).trim() : undefined;
    if (!subject || !message) return NextResponse.json({ success: false, error: "Subject dan pesan wajib." }, { status: 400 });
    const now = new Date();
    const ticket = {
      ticketId: genTicketId(),
      email,
      subject,
      orderId: orderId || null,
      status: "open" as const,
      createdAt: now,
      updatedAt: now,
      messages: [
        { author: "user", email, text: message, createdAt: now }
      ],
    };
    const db = await getDb();
    await db.collection("tickets").insertOne(ticket as any);
    return NextResponse.json({ success: true, ticketId: ticket.ticketId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
