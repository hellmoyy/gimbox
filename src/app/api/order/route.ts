import { NextRequest } from "next/server";
import axios from "axios";
import { getDb } from "../../../lib/mongodb";

const DIGIFLAZZ_URL = "https://api.digiflazz.com/v1/transaction";
const API_KEY = process.env.DIGIFLAZZ_API_KEY;
const USERNAME = process.env.DIGIFLAZZ_USERNAME;
import { MIDTRANS_SERVER_KEY as CFG_MID_SERVER, MIDTRANS_CLIENT_KEY as CFG_MID_CLIENT } from "@/lib/runtimeConfig";
const MIDTRANS_SERVER_KEY = (typeof CFG_MID_SERVER === "string" && CFG_MID_SERVER.length ? CFG_MID_SERVER : undefined) || process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = (typeof CFG_MID_CLIENT === "string" && CFG_MID_CLIENT.length ? CFG_MID_CLIENT : undefined) || process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

function getSignature(
  username: string,
  apiKey: string,
  buyerSku: string,
  customerNo: string
) {
  // Digiflazz signature: md5(username+apiKey+buyerSku+customerNo)
  const crypto = require("crypto");
  return crypto
    .createHash("md5")
    .update(username + apiKey + buyerSku + customerNo)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, userId, email, nominal, price } = body;
  const gateway: string = (body?.gateway || "midtrans").toLowerCase();
  // Optional extra fields for richer transaction tracking
  const provider: string = body?.provider || "digiflazz"; // default current flow
  const buyPrice: number | null = typeof body?.buyPrice === "number" ? body.buyPrice : null;
  const adminFee: number = typeof body?.adminFee === "number" ? body.adminFee : 0;
  const gatewayFee: number = typeof body?.gatewayFee === "number" ? body.gatewayFee : 0;
  const otherFee: number = typeof body?.otherFee === "number" ? body.otherFee : 0;

  // 1. Order ke Digiflazz (dummy, bisa diaktifkan)
  const sign = getSignature(USERNAME!, API_KEY!, code, userId);
  const digiflazzPayload = {
    username: USERNAME,
    buyer_sku_code: code,
    customer_no: userId,
    order_id: Date.now().toString(),
    ref_id: Date.now().toString(),
    sign,
  };
  // const digiflazzRes = await axios.post(DIGIFLAZZ_URL, digiflazzPayload);
  // if (!digiflazzRes.data.success) return Response.json({ success: false, message: digiflazzRes.data.message });

  // 2. Buat transaksi ke gateway terpilih (saat ini: Midtrans)
  if (gateway !== "midtrans") {
    return Response.json({ success: false, message: `Gateway ${gateway} belum didukung` }, { status: 400 });
  }
  // Ambil konfigurasi Midtrans dari DB settings; fallback ke env jika belum diset
  const db = await getDb();
  const settingsDoc = await db.collection("settings").findOne({ key: "gateway:midtrans" });
  const cfg = settingsDoc?.value || {};
  const useProduction = Boolean(cfg?.keys?.production ?? MIDTRANS_IS_PRODUCTION);
  const serverKey = String(cfg?.keys?.serverKey || MIDTRANS_SERVER_KEY || "");
  const clientKey = String(cfg?.keys?.clientKey || MIDTRANS_CLIENT_KEY || "");
  const enabled = Boolean(cfg?.enabled);
  if (!enabled) {
    return Response.json({ success: false, message: "Pembayaran Midtrans dinonaktifkan" }, { status: 400 });
  }
  if (!serverKey) {
    return Response.json({ success: false, message: "Server Key Midtrans belum dikonfigurasi" }, { status: 400 });
  }

  const methods: string[] = Array.isArray(cfg?.methods) ? cfg.methods : [];
  const mapPay: Record<string, string> = {
    qris: "qris",
    gopay: "gopay",
    shopeepay: "shopeepay",
    va_bca: "bca_va",
    va_bni: "bni_va",
    va_bri: "bri_va",
    va_permata: "permata_va",
  };
  const enabledPayments = methods.map((m) => mapPay[m]).filter(Boolean);

  const midtransUrl = useProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const midtransPayload: any = {
    transaction_details: {
      order_id: digiflazzPayload.order_id,
      gross_amount: price || 10000,
    },
    customer_details: { email },
  };
  if (enabledPayments.length) midtransPayload.enabled_payments = enabledPayments;
  let snapToken = "";
  let snapRedirectUrl = "";
  try {
    const midtransRes = await axios.post(midtransUrl, midtransPayload, {
      headers: {
        Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    });
    snapToken = midtransRes.data.token;
    snapRedirectUrl = midtransRes.data.redirect_url || "";
  } catch (err: any) {
    return Response.json({ success: false, message: "Gagal membuat transaksi Midtrans", error: err.message });
  }

  // 3. Simpan order ke MongoDB
  try {
    await db.collection("orders").insertOne({
      orderId: digiflazzPayload.order_id,
  provider,
      paymentGateway: gateway,
      code,
      userId,
      email,
      nominal,
  sellPrice: price,
  buyPrice,
  fees: { admin: adminFee, gateway: gatewayFee, other: otherFee, total: Number(adminFee + gatewayFee + otherFee) },
      snapToken,
      snapRedirectUrl,
      status: "pending",
      createdAt: new Date(),
  updatedAt: new Date(),
    });
  } catch (e: any) {
    console.error("[order] failed to insert order:", e.message);
  }

  return Response.json({
    success: true,
    message: "Order berhasil dibuat, lanjutkan pembayaran.",
  snapToken,
  snapRedirectUrl,
  midtransClientKey: clientKey || undefined,
  data: { code, userId, email, nominal, price },
  });
}
