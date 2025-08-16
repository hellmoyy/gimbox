import { getDb } from "../../../../../lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.collection("orders").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(5000).toArray();
    const head = [
      "orderId","createdAt","provider","code","userId","email","status","sellPrice","buyPrice","feeAdmin","feeGateway","feeOther","feeTotal"
    ];
    const lines = rows.map((r: any) => [
      r.orderId,
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.provider || "",
      r.code || "",
      r.userId || "",
      r.email || "",
      r.status || "",
      r.sellPrice ?? r.price ?? "",
      r.buyPrice ?? "",
      r.fees?.admin ?? "",
      r.fees?.gateway ?? "",
      r.fees?.other ?? "",
      r.fees?.total ?? "",
    ].join(","));
    const csv = [head.join(","), ...lines].join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
