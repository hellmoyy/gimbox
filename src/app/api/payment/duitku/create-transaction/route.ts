import { NextRequest } from "next/server";
import { DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_SANDBOX } from "@/lib/runtimeConfig";
import { duitkuSignatureTransaction } from "@/lib/duitku";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentAmount, paymentMethod, merchantOrderId, productDetails, email, customerVaName, callbackUrl, returnUrl, itemDetails, customerDetail } = body;
  const signature = duitkuSignatureTransaction(merchantOrderId, paymentAmount);
  const url = DUITKU_SANDBOX
    ? "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry"
    : "https://passport.duitku.com/webapi/api/merchant/v2/inquiry";
  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
    paymentAmount,
    paymentMethod,
    merchantOrderId,
    productDetails,
    email,
    customerVaName,
    callbackUrl,
    returnUrl,
    itemDetails,
    customerDetail,
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
