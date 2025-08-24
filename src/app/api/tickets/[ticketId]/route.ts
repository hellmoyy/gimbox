import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { UpdateFilter } from "mongodb";
import { getToken } from "next-auth/jwt";

type TicketMessage = {
  author: "user" | "admin";
  email?: string;
  text: string;
  createdAt: Date;
  attachments?: { url: string; name: string; size: number; type: string }[];
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
    const contentType = req.headers.get('content-type') || '';
    let message = '';
    let attachments: { url: string; name: string; size: number; type: string }[] = [];
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      message = String(form.get('message') || '').trim();
      const files = form.getAll('images');
      const maxFiles = 5;
      const maxSize = 2 * 1024 * 1024; // 2MB each
      const pathMod = await import('path');
      const fs = await import('fs/promises');
      const { ticketId } = await params;
      const baseDir = pathMod.join(process.cwd(), 'public', 'uploads', 'tickets', ticketId);
      try { await fs.mkdir(baseDir, { recursive: true }); } catch {}
      let count = 0;
      for (const f of files) {
        if (!(f instanceof File)) continue;
        if (!f.type.startsWith('image/')) continue;
        if (f.size > maxSize) continue;
        if (count >= maxFiles) break;
        const ab = await f.arrayBuffer();
        const buf = Buffer.from(ab);
        const safeName = (f.name || 'image').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const fileName = Date.now().toString() + '_' + safeName;
        const fullPath = pathMod.join(baseDir, fileName);
        try {
          await fs.writeFile(fullPath, buf);
          attachments.push({
            url: `/uploads/tickets/${ticketId}/${fileName}`,
            name: f.name || fileName,
            size: f.size,
            type: f.type,
          });
          count++;
        } catch {}
      }
    } else {
      // JSON body fallback
      const body = await req.json();
      message = String(body?.message || '').trim();
    }
    if (!message) return NextResponse.json({ success: false, error: 'Pesan wajib.' }, { status: 400 });
    const now = new Date();
    const db = await getDb();
    const tickets = db.collection<TicketDoc>('tickets');
    const { ticketId } = await params;
    // Fetch existing messages to enforce consecutive user message limit
    const existing = await tickets.findOne({ ticketId, email }, { projection: { messages: 1 } });
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    let consecutiveUser = 0;
    for (let i = (existing.messages?.length || 0) - 1; i >= 0; i--) {
      const m = existing.messages[i];
      if (m.author === 'user') consecutiveUser++; else break;
    }
    if (consecutiveUser >= 5) {
      return NextResponse.json({ success: false, error: 'Batas 5 pesan tercapai. Tunggu balasan admin.' }, { status: 429 });
    }
    const pushMsg: TicketMessage = { author: 'user', email, text: message, createdAt: now };
    if (attachments.length) pushMsg.attachments = attachments;
    const update: UpdateFilter<TicketDoc> = {
      $push: { messages: pushMsg },
      $set: { updatedAt: now, status: 'open' },
    };
    const res = await tickets.updateOne({ ticketId, email }, update);
    if (!res.matchedCount) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, attachments });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
