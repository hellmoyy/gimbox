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
    // Also provide active payments ordering for client UIs
    const ap = await db.collection("settings").findOne({ key: "gateway:active_payments" });
    const activePayments = Array.isArray(ap?.value?.items) ? ap!.value.items : [];
    // Only return enabled items and keep order
    const filtered = activePayments
      .filter((it: any) => it && it.enabled !== false)
      .map((it: any) => ({
        id: String(it.id),
        label: it.label,
        gateway: it.gateway,
        method: it.method,
        logoUrl: it.logoUrl,
        enabled: it.enabled,
        sort: it.sort,
        feeType: it.feeType === 'percent' ? 'percent' : 'flat',
        feeValue: typeof it.feeValue === 'number' ? it.feeValue : Number(it.feeValue || 0) || 0,
      }))
      .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0));
    return Response.json({ success: true, data, activePayments: filtered });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
