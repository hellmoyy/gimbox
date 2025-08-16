import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/adminAuth";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  return !!cookie && cookie === guard;
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const adminsCount = await db.collection('admins').countDocuments();

  // If there are already admins, require auth. Otherwise, allow first-time seeding.
  if (adminsCount > 0 && !ensureAdmin(req)) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String((body as any)?.email || '').toLowerCase();
  const password = String((body as any)?.password || '');
  if (!email || !password) return Response.json({ success: false, message: 'Email dan password wajib diisi' }, { status: 400 });

  const { salt, hash } = hashPassword(password);
  await db.collection('admins').updateOne(
    { email },
    { $set: { email, salt, hash, roles: ['superadmin'], updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  return Response.json({ success: true, initial: adminsCount === 0 });
}

export async function GET(req: NextRequest) {
  const db = await getDb();
  const adminsCount = await db.collection('admins').countDocuments();

  if (adminsCount > 0 && !ensureAdmin(req)) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const emailQ = url.searchParams.get('email') || process.env.ADMIN_USER || '';
  const passQ = url.searchParams.get('password') || process.env.ADMIN_PASS || '';
  const email = String(emailQ || '').toLowerCase();
  const password = String(passQ || '');
  if (!email || !password) return Response.json({ success: false, message: 'Email dan password wajib diisi' }, { status: 400 });

  const { salt, hash } = hashPassword(password);
  await db.collection('admins').updateOne(
    { email },
    { $set: { email, salt, hash, roles: ['superadmin'], updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  return Response.json({ success: true, initial: adminsCount === 0 });
}
