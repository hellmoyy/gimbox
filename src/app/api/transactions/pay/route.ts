import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { MIDTRANS_CLIENT_KEY as CFG_MID_CLIENT } from "@/lib/runtimeConfig";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") || "";
    if (!orderId) {
      return NextResponse.json({ success: false, message: "Missing orderId" }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = String(token.email).toLowerCase();

    const db = await getDb();
    const order = await db.collection("orders").findOne(
      { orderId, email },
      { projection: { _id: 0, orderId: 1, email: 1, status: 1, paymentGateway: 1, method: 1, sellPrice: 1, details: 1, snapToken: 1, snapRedirectUrl: 1, fees: 1, productCode: 1, productLabel: 1, variantLabel: 1, variantPrice: 1 } }
    );
    if (!order) {
      return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
    }

    const statusStr = String(order.status || "").toLowerCase();
  const isPending = ["pending", "waiting_payment", "unpaid"].includes(statusStr);

    const gateway = String(order.paymentGateway || "").toLowerCase();

    const fees = (order as any).fees || {};
    const feesTotal = Number(fees.total || 0);
    const feesGateway = Number(fees.gateway || 0);
    const feesAdmin = Number(fees.admin || 0);
    const feesOther = Number(fees.other || 0);
    const sellPrice = Number((order as any).sellPrice || 0);
    const baseAmount = Math.max(0, sellPrice - feesTotal);
    const feePercent = baseAmount > 0 ? (feesTotal / baseAmount) * 100 : 0;

    // If already paid, return success summary for instruction page
    if (!isPending) {
      return NextResponse.json({ success: true, status: "success", method: order.method, amount: order.sellPrice, feesTotal, feesGateway, feesAdmin, feesOther, baseAmount, feePercent, productCode: (order as any).productCode, productLabel: (order as any).productLabel, variantLabel: (order as any).variantLabel, variantPrice: (order as any).variantPrice });
    }

    // Build instruction payload per gateway
  if (gateway === "moota") {
      const d = (order as any).details || {};
      return NextResponse.json({
        success: true,
        status: "pending",
        method: order.method || "bank_transfer",
    amount: sellPrice,
  productCode: (order as any).productCode,
  productLabel: (order as any).productLabel,
  variantLabel: (order as any).variantLabel,
  variantPrice: (order as any).variantPrice,
    baseAmount,
    feesTotal,
    feesGateway,
    feesAdmin,
    feesOther,
    feePercent,
        bankName: d.bankName || "BCA",
        accountNumber: d.accountNumber || "1234567890",
        accountHolder: d.accountHolder || "PT Contoh",
        qrCodeUrl: d.qrCodeUrl || undefined,
      });
    }

    if (gateway === "xendit") {
      const d = (order as any).details || {};
      // Minimal placeholder: return method and amount; UI will handle QR dummy if needed
      return NextResponse.json({
        success: true,
        status: "pending",
        method: order.method || "xendit",
        amount: sellPrice,
        productCode: (order as any).productCode,
        productLabel: (order as any).productLabel,
        variantLabel: (order as any).variantLabel,
        variantPrice: (order as any).variantPrice,
        baseAmount,
        feesTotal,
        feesGateway,
        feesAdmin,
        feesOther,
        feePercent,
        bankName: d.bankName || "BCA",
        accountNumber: d.accountNumber || "5775458264",
        accountHolder: d.accountHolder || "Helmi Andito Purnama",
        qrCodeUrl: d.qrCodeUrl || undefined,
      });
    }

    if (gateway !== "midtrans") {
      return NextResponse.json({ success: false, message: `Gateway ${gateway} belum didukung untuk lanjut bayar` }, { status: 400 });
    }

    // Get Midtrans client key from settings (fallback to env/runtimeConfig)
    const settingsDoc = await db.collection("settings").findOne({ key: "gateway:midtrans" });
    const clientKey = String(settingsDoc?.value?.keys?.clientKey || CFG_MID_CLIENT || process.env.MIDTRANS_CLIENT_KEY || "");

    return NextResponse.json({
      success: true,
      snapToken: (order as any).snapToken || "",
      snapRedirectUrl: (order as any).snapRedirectUrl || "",
      midtransClientKey: clientKey || undefined,
      status: "pending",
      method: order.method || "midtrans",
  amount: sellPrice,
  productCode: (order as any).productCode,
  productLabel: (order as any).productLabel,
  variantLabel: (order as any).variantLabel,
  variantPrice: (order as any).variantPrice,
  baseAmount,
  feesTotal,
  feesGateway,
  feesAdmin,
  feesOther,
  feePercent,
    });
  } catch (e: any) {
    const message = e?.message || "Unexpected error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
