import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { MOOTA_WEBHOOK_TOKEN } from "@/lib/runtimeConfig";

// Minimal Moota webhook handler (sandbox/demo):
// Expects body with fields: account_number, amount, description/reference containing orderId
export async function POST(req: NextRequest) {
  try {
    // Optional verification via shared token header
    const token = req.headers.get("x-webhook-token") || req.headers.get("x-moota-token") || "";
    if (MOOTA_WEBHOOK_TOKEN && token !== MOOTA_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, message: "Invalid token" }, { status: 401 });
    }
    const db = await getDb();
  const headers = Object.fromEntries(req.headers.entries());
  const body = await req.json();
    // Attempt to find orderId in description/reference
    const desc: string = String(body?.description || body?.note || body?.ref || "");
  const m = desc.match(/(order[_\- ]?id|invoice|inv)[^\d]*(\d{6,})/i) || desc.match(/\b(\d{8,})\b/);
  const orderId = (String(body?.order_id || body?.orderId || "").trim()) || (m ? (m[2] || m[1]) : "");
  const amount = Number(body?.amount || body?.nominal || 0);
  if (!orderId || !amount) return NextResponse.json({ ok: false, message: "Missing orderId or amount" }, { status: 400 });

    const order = await db.collection("orders").findOne({ orderId });
    if (!order) return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });

    // Optional bank account matching: compare webhook account number with order.details.accountNumber
    const hookAcc: string = String(
      body?.account_number || body?.accountNumber || body?.bank_account?.account_number || body?.bank?.number || ""
    );
    const ordAcc: string = String((order as any)?.details?.accountNumber || "");
    const onlyDigits = (v: string) => v.replace(/\D+/g, "");
    if (ordAcc && hookAcc && onlyDigits(ordAcc) !== onlyDigits(hookAcc)) {
      // Log and accept but not mark paid
      await db.collection("webhook_logs").insertOne({
        src: "moota",
        ts: new Date(),
        matched: false,
        reason: "account_mismatch",
        orderId,
        orderAccount: ordAcc,
        hookAccount: hookAcc,
        amount,
        headers,
        body,
      });
      return NextResponse.json({ ok: false, message: "Account mismatch" }, { status: 202 });
    }

    // Accept payment if amount equals unique-coded amount or >= total
    const sellPrice = Number(order.sellPrice || 0);
    // Recompute unique-code amount similarly to UI logic (last 3 digits of orderId)
    const digits = String(orderId).replace(/\D/g, "");
    let code = digits.slice(-3) || "";
    if (!code) {
      let s = 0; const id = String(orderId);
      for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i)) % 1000;
      code = String(s).padStart(3, "0");
    }
    if (code === "000") code = "321";
    const expected = sellPrice + Number(code);
    const match = amount === expected || amount >= sellPrice;
    await db.collection("webhook_logs").insertOne({
      src: "moota",
      ts: new Date(),
      matched: match,
      orderId,
      amount,
      sellPrice,
      expected,
      code,
      headers,
      body,
    });
    if (match) {
      await db.collection("orders").updateOne({ orderId }, { $set: { status: "paid", updatedAt: new Date(), mootaPaid: body } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, message: "Amount not matched" }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
