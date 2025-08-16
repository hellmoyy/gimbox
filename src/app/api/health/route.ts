import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import * as CFG from "@/lib/runtimeConfig";

export async function GET() {
  const checks: Record<string, any> = {
    env: {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET || !!process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      MONGODB_URI: !!process.env.MONGODB_URI,
    },
    hardcoded: {
      NEXTAUTH_URL: !!CFG.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!CFG.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: !!CFG.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!CFG.GOOGLE_CLIENT_SECRET,
      MONGODB_URI: !!CFG.MONGODB_URI,
      MIDTRANS_SERVER_KEY: !!CFG.MIDTRANS_SERVER_KEY,
      MIDTRANS_CLIENT_KEY: !!CFG.MIDTRANS_CLIENT_KEY,
      VCGAMERS_API_KEY: !!CFG.VCGAMERS_API_KEY,
      VCGAMERS_SECRET_KEY: !!CFG.VCGAMERS_SECRET_KEY,
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
