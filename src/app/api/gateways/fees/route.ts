import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({ key: "gateway:midtrans" });
    const cfg = (doc?.value || {}) as any;
    // Expect optional fee map, e.g. { qris: 0, gopay: 1000, shopeepay: 1500, va_bca: 1000, va_bni: 1000, va_bri: 1000, va_permata: 0 }
    const fees = cfg.fees || {};
    return NextResponse.json({ success: true, fees });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
