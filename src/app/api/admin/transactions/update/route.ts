import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderId, status, sellPrice, buyPrice, adminFee, gatewayFee, otherFee, provider } = body || {};
  if (!orderId) return Response.json({ success: false, message: "Missing orderId" }, { status: 400 });
  try {
    const db = await getDb();
    const set: any = { updatedAt: new Date() };
    if (status) set.status = status;
    if (provider) set.provider = provider;
    if (typeof sellPrice === "number") set.sellPrice = sellPrice;
    if (typeof buyPrice === "number") set.buyPrice = buyPrice;
    const fees: any = {};
    if (typeof adminFee === "number") fees.admin = adminFee;
    if (typeof gatewayFee === "number") fees.gateway = gatewayFee;
    if (typeof otherFee === "number") fees.other = otherFee;
    if (Object.keys(fees).length) {
      // Recompute total if any fee changed
      const doc = await db.collection("orders").findOne({ orderId });
      const current = doc?.fees || {};
      const merged = { admin: current.admin || 0, gateway: current.gateway || 0, other: current.other || 0, ...fees };
      set.fees = { ...merged, total: Number((merged.admin || 0) + (merged.gateway || 0) + (merged.other || 0)) };
    }
    await db.collection("orders").updateOne({ orderId }, { $set: set });
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
