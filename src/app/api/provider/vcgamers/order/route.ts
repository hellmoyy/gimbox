import { NextRequest } from "next/server";
import { createOrder, getOrderStatus } from "../../../../../lib/providers/vcgamers";
import { getDb } from "../../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { productCode, customerId, serverId, refId, notes } = body || {};
  if (!productCode || !customerId || !refId) {
    return Response.json({ success: false, message: "Missing productCode/customerId/refId" }, { status: 400 });
  }
  const res = await createOrder({ productCode, customerId, serverId, refId, notes });

  // Try to persist provider payload and buyPrice if available
  try {
    const db = await getDb();
    const priceFromProvider = Number(
      res?.data?.data?.price ?? res?.data?.price ?? res?.data?.data?.cost ?? res?.data?.cost ?? 0
    );
    const set: any = {
      provider: "vcgamers",
      providerPayload: res?.data || res,
      updatedAt: new Date(),
    };
    if (Number.isFinite(priceFromProvider) && priceFromProvider > 0) set.buyPrice = priceFromProvider;
    // refId is our orderId by design in current create flow; update matching order if exists
    await db.collection("orders").updateOne(
      { orderId: String(refId) },
      { $set: set }
    );
  } catch {}
  const status = res.success ? 200 : 502;
  return Response.json(res, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return Response.json({ success: false, message: "Missing orderId" }, { status: 400 });
  const res = await getOrderStatus(orderId);
  const status = res.success ? 200 : 502;
  return Response.json(res, { status });
}
