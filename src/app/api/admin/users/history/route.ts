import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function mapStatus(s?: string): "Sukses" | "Pending" | "Diproses" | "Gagal" {
  const v = String(s || "").toLowerCase();
  if (["settlement", "capture", "success", "paid", "done", "complete"].includes(v)) return "Sukses";
  if (["pending", "waiting_payment", "unpaid"].includes(v)) return "Pending";
  if (["process", "processing", "onprogress", "proses", "diproses", "paid_processing", "paid_but_processing"].includes(v)) return "Diproses";
  return "Gagal"; // expire, cancel, deny, failure, failed
}

export async function GET(req: NextRequest) {
  // Admin cookie guard (same as middleware)
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10)));
  if (!email) return Response.json({ success: false, message: "Parameter email wajib diisi" }, { status: 400 });

  const db = await getDb();
  const col = db.collection("orders");

  const filter: any = {
    email,
    $or: [
      { code: "gimcash-topup" }, // our defined topup code
      { provider: "wallet-topup" }, // future-proofing
      { paymentGateway: "wallet" }, // potential wallet debits in the future
    ],
  };

  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter, {
      projection: { _id: 0, orderId: 1, email: 1, code: 1, sellPrice: 1, nominal: 1, status: 1, createdAt: 1 },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = rows.map((r: any) => ({
    id: r.orderId,
    date: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || ""),
    title: r.code === "gimcash-topup" || r.provider === "wallet-topup" ? "Top Up GimCash" : "Wallet",
    amount: Number(r.sellPrice ?? r.nominal ?? 0),
    status: mapStatus(r.status),
  }));

  return Response.json({
    success: true,
    data: items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
