import { NextRequest } from "next/server";
import { DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_SANDBOX } from "@/lib/runtimeConfig";
import { duitkuSignatureGetPaymentMethod } from "@/lib/duitku";

export async function POST(req: NextRequest) {
  const { amount } = await req.json();
  const datetime = new Date().toISOString().slice(0, 19).replace("T", " ");
  const signature = duitkuSignatureGetPaymentMethod(amount, datetime);
  const url = DUITKU_SANDBOX
    ? "https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod"
    : "https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod";
  const payload = {
    merchantcode: DUITKU_MERCHANT_CODE,
    amount,
    datetime,
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
