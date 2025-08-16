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

    const items = rows.map((r: any) => ({
      id: r.orderId,
      date: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ""),
      product: nameByCode[r.code] || r.code || "-",
      target: r.userId || r.email,
      amount: Number(r.sellPrice || 0),
      status: mapStatus(r.status),
    }));

    return NextResponse.json({ success: true, items });
  } catch (e: any) {
    const message = e?.name === "MongoServerSelectionError" ? "Database unavailable" : e?.message || "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
