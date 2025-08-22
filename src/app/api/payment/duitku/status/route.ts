import { NextRequest } from "next/server";
import { DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_SANDBOX } from "@/lib/runtimeConfig";
import { duitkuSignatureStatus } from "@/lib/duitku";

export async function POST(req: NextRequest) {
  const { merchantOrderId } = await req.json();
  const signature = duitkuSignatureStatus(merchantOrderId);
  const url = DUITKU_SANDBOX
    ? "https://sandbox.duitku.com/webapi/api/merchant/transactionStatus"
    : "https://passport.duitku.com/webapi/api/merchant/transactionStatus";
  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
    merchantOrderId,
    signature,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
