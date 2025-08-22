import { NextRequest } from "next/server";
import { DUITKU_MERCHANT_CODE, DUITKU_API_KEY } from "@/lib/runtimeConfig";
import { duitkuSignatureCallback } from "@/lib/duitku";

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const merchantCode = body.get("merchantCode");
  const amount = body.get("amount");
  const merchantOrderId = body.get("merchantOrderId");
  const signature = body.get("signature");
  const expectedSignature = duitkuSignatureCallback(Number(amount), String(merchantOrderId));
  if (merchantCode !== DUITKU_MERCHANT_CODE || signature !== expectedSignature) {
    return Response.json({ success: false, message: "Invalid signature" }, { status: 401 });
  }
  // TODO: update transaction status in DB
  return Response.json({ success: true });
}
