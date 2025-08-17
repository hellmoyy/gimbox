import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { UpdateFilter } from "mongodb";
import { getToken } from "next-auth/jwt";

type TicketMessage = {
  author: "user" | "admin";
  email?: string;
  text: string;
  createdAt: Date;
};

type TicketDoc = {
  ticketId: string;
  email: string;
  status: string;
  updatedAt: Date;
  messages: TicketMessage[];
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = String(token.email).toLowerCase();
  const { ticketId } = await params;
  const db = await getDb();
  const tickets = db.collection<TicketDoc>("tickets");
  const row = await tickets.findOne({ ticketId, email }, { projection: { _id: 0 } });
    if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ticket: row });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
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
    const tickets = db.collection<TicketDoc>("tickets");
    const update: UpdateFilter<TicketDoc> = {
      $push: { messages: { author: "user", email, text: message, createdAt: now } },
      $set: { updatedAt: now, status: "open" },
    };
    const { ticketId } = await params;
    const res = await tickets.updateOne({ ticketId, email }, update);
    if (!res.matchedCount) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
