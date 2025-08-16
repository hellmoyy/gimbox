import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

function mapStatus(s?: string): "Sukses" | "Pending" | "Diproses" | "Gagal" {
  const v = String(s || "").toLowerCase();
  if (["settlement", "capture", "success", "paid", "done", "complete"].includes(v)) return "Sukses";
  if (["pending", "waiting_payment", "unpaid"].includes(v)) return "Pending";
  if (["process", "processing", "onprogress", "proses", "diproses", "paid_processing", "paid_but_processing"].includes(v)) return "Diproses";
  return "Gagal"; // expire, cancel, deny, failure, failed -> Gagal
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
    const token = await getToken({ req, secret });
    if (!token || !token.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = String(token.email).toLowerCase();
    const db = await getDb();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const match: any = { email };
    if (statusFilter) {
      const sf = statusFilter.toLowerCase();
      let statuses: string[] | null = null;
      if (sf === "pending" || sf === "menunggu pembayaran") {
        statuses = ["pending", "waiting_payment", "unpaid"];
      } else if (sf === "diproses") {
        statuses = ["process", "processing", "onprogress", "proses", "diproses", "paid_processing", "paid_but_processing"];
      } else if (sf === "sukses" || sf === "selesai") {
        statuses = ["settlement", "capture", "success", "paid", "done", "complete"];
      } else if (sf === "gagal" || sf === "dibatalkan") {
        statuses = ["expire", "cancel", "denied", "deny", "failure", "failed", "error"];
      }
      if (Array.isArray(statuses)) {
        match.status = { $in: statuses };
      }
    }

    const rows = await db
      .collection("orders")
    .find(match, {
        projection: {
          _id: 0,
          orderId: 1,
          code: 1,
          userId: 1,
          email: 1,
          sellPrice: 1,
          status: 1,
          createdAt: 1,
          paymentGateway: 1,
      method: 1,
          // Minimal Midtrans fields to derive payment method
          "midtransNotification.payment_type": 1,
          "midtransNotification.va_numbers": 1,
          "midtransNotification.bank": 1,
          "midtransNotification.store": 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const codes = Array.from(new Set(rows.map((r: any) => r.code).filter(Boolean)));
    let nameByCode: Record<string, string> = {};
    if (codes.length) {
      const prods = await db.collection("products").find({ code: { $in: codes } }, { projection: { _id: 0, code: 1, name: 1 } }).toArray();
      nameByCode = Object.fromEntries(prods.map((p: any) => [p.code, p.name]));
    }

    function deriveMethod(r: any): string {
      // 1) Prefer explicitly stored intent/method on the order (from checkout selection)
      const om = String(r?.method || "").toLowerCase();
      if (om) {
        if (om.includes("qris") || /\bqr\b/.test(om)) return "QRIS";
        if (om.includes("gopay")) return "GoPay";
        if (om.includes("shopee")) return "ShopeePay";
        if (om.includes("ovo")) return "OVO";
        if (om.includes("dana")) return "DANA";
        if (om.includes("emoney") || om.includes("e-money")) return "E-Money";
        if ((om.includes("bank") && om.includes("transfer")) || /\brek\b|\brekening\b|\btf\b|\bbca\b|\bbni\b|\bbri\b|\bmandiri\b/.test(om)) return "Bank Transfer";
        if (om.includes("va") || om.includes("virtual account") || om.includes("virtual_account") || om.includes("permata")) return "Virtual Account";
      }

      // 2) Fallback to Midtrans notification (if any)
      const pt = r?.midtransNotification?.payment_type;
      if (pt) {
        const v = String(pt).toLowerCase();
        if (v === "qris") return "QRIS";
        if (v === "gopay") return "GoPay";
        if (v === "shopeepay") return "ShopeePay";
        if (v === "credit_card") return "Kartu Kredit";
        if (v === "cstore") {
          const store = String(r?.midtransNotification?.store || "").toUpperCase();
          return store || "Gerai";
        }
        if (v === "bank_transfer") {
          const va = Array.isArray(r?.midtransNotification?.va_numbers) ? r.midtransNotification.va_numbers[0] : null;
          const bank = String(va?.bank || r?.midtransNotification?.bank || "").toUpperCase();
          return bank ? `${bank} Virtual Account` : "Bank Transfer";
        }
        if (v === "echannel") return "Mandiri Bill";
        if (v === "permata") return "Permata Virtual Account";
        return v.charAt(0).toUpperCase() + v.slice(1);
      }
      // Fallback to payment gateway name
      const gw = String(r?.paymentGateway || "").trim();
      return gw ? gw.charAt(0).toUpperCase() + gw.slice(1) : "-";
    }

    const items = rows.map((r: any) => ({
      id: r.orderId,
      date: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ""),
      product: nameByCode[r.code] || r.code || "-",
      target: r.userId || r.email,
      amount: Number(r.sellPrice || 0),
      status: mapStatus(r.status),
      method: deriveMethod(r),
      methodRaw: String(r?.method || ""),
    }));

    return NextResponse.json({ success: true, items });
  } catch (e: any) {
    const message = e?.name === "MongoServerSelectionError" ? "Database unavailable" : e?.message || "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
