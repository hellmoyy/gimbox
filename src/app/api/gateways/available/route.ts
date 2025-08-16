import { getDb } from "../../../../lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const keys = ["gateway:midtrans", "gateway:xendit", "gateway:moota"];
  const docs = await db.collection("settings").find({ key: { $in: keys } }).toArray();
    const map: Record<string, any> = {};
    for (const d of docs) map[d.key] = d.value || {};
    const data = [
      { name: "midtrans", enabled: Boolean(map["gateway:midtrans"]?.enabled), methods: Array.isArray(map["gateway:midtrans"]?.methods) ? map["gateway:midtrans"].methods : [] },
  // Xendit methods suggestion: ["qris", "va_bca", "va_bni", "va_bri", "ewallet"]
      { name: "xendit", enabled: Boolean(map["gateway:xendit"]?.enabled), methods: Array.isArray(map["gateway:xendit"]?.methods) ? map["gateway:xendit"].methods : [] },
      { name: "moota", enabled: Boolean(map["gateway:moota"]?.enabled), methods: Array.isArray(map["gateway:moota"]?.methods) ? map["gateway:moota"].methods : [] },
    ];
    return Response.json({ success: true, data });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
