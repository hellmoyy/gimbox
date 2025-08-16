import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";

// Midtrans HTTP Notification webhook
export async function POST(req: NextRequest) {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {}

  const orderId = String(payload?.order_id || "");
  if (!orderId) return Response.json({ received: false, message: "missing order_id" }, { status: 400 });

  // Map Midtrans status to internal status
  // transaction_status: capture, settlement, pending, deny, cancel, expire, failure, refund, chargeback
  const txStatus = String(payload?.transaction_status || "");
  const fraudStatus = String(payload?.fraud_status || "");
  let status = "pending";
  if (txStatus === "settlement" || (txStatus === "capture" && fraudStatus !== "challenge")) status = "paid";
  else if (txStatus === "pending") status = "pending";
  else if (["deny","cancel","expire","failure"].includes(txStatus)) status = "failed";

  // Derive gateway fee if fields exist
  // Midtrans may include gross_amount, fee, or breakdown in VA/QRIS/etc-specific fields.
  const feeCandidates = [
    Number(payload?.fee || 0),
    Number(payload?.transaction_fee || 0),
    Number(payload?.acquirer?.fee || 0),
  ];
  const gatewayFee = feeCandidates.find((n) => Number.isFinite(n) && n > 0) || 0;

  try {
    const db = await getDb();
    const doc = await db.collection("orders").findOne({ orderId });
    const currentFees = doc?.fees || {};
    const mergedFees: any = {
      admin: Number(currentFees.admin || 0),
      gateway: gatewayFee > 0 ? Number(gatewayFee) : Number(currentFees.gateway || 0),
      other: Number(currentFees.other || 0),
    };
    mergedFees.total = Number((mergedFees.admin || 0) + (mergedFees.gateway || 0) + (mergedFees.other || 0));

    await db.collection("orders").updateOne(
      { orderId },
      {
        $set: {
          status,
          fees: mergedFees,
          midtransNotification: payload,
          updatedAt: new Date(),
        },
      }
    );
  } catch (e) {
    // swallow to avoid retries storm; still 200 OK to Midtrans
  }
  return Response.json({ received: true });
}
