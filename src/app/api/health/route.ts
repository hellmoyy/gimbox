import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET || !!process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      MONGODB_URI: !!process.env.MONGODB_URI,
    },
  };

  try {
    const db = await getDb();
    // quick ping via listCollections with limit 1
    await db.listCollections({}, { nameOnly: true }).toArray();
    checks.mongo = { ok: true };
  } catch (err: any) {
    checks.mongo = { ok: false, error: err?.message || String(err) };
  }

  return NextResponse.json(checks, { status: 200 });
}
