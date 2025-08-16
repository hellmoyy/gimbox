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
      { projection: { _id: 0, orderId: 1, email: 1, status: 1, paymentGateway: 1, snapToken: 1, snapRedirectUrl: 1 } }
    );
    if (!order) {
      return NextResponse.json({ success: false, message: "Order tidak ditemukan" }, { status: 404 });
    }

    const statusStr = String(order.status || "").toLowerCase();
    const isPending = ["pending", "waiting_payment", "unpaid"].includes(statusStr);
    if (!isPending) {
      return NextResponse.json({ success: false, message: "Order bukan menunggu pembayaran" }, { status: 400 });
    }

    const gateway = String(order.paymentGateway || "").toLowerCase();
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
    });
  } catch (e: any) {
    const message = e?.message || "Unexpected error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
