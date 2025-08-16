import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "../../../../../lib/providers/vcgamers";
import { getDb } from "../../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-signature") || req.headers.get("x-signature-hmac") || undefined;
  if (!verifyWebhookSignature(raw, signature)) {
    return Response.json({ success: false, message: "Invalid signature" }, { status: 401 });
  }
  const payload = JSON.parse(raw);
  const orderId = payload?.order_id || payload?.data?.order_id;
  const status = payload?.status || payload?.data?.status;
  if (!orderId) return Response.json({ success: true });

  try {
    const db = await getDb();
    await db.collection("orders").updateOne(
      { orderId },
      { $set: { status, providerPayload: payload, updatedAt: new Date() } }
    );
  } catch {
    // ignore DB errors to not trigger retries if any
  }
  return Response.json({ success: true });
}
