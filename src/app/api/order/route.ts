import { NextRequest } from "next/server";
import axios from "axios";
import { getDb } from "../../../lib/mongodb";

const DIGIFLAZZ_URL = "https://api.digiflazz.com/v1/transaction";
const API_KEY = process.env.DIGIFLAZZ_API_KEY;
const USERNAME = process.env.DIGIFLAZZ_USERNAME;
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
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
  const { code, userId, email, nominal, price } = await req.json();

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

  // 2. Buat transaksi Midtrans
  const midtransUrl = MIDTRANS_IS_PRODUCTION
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const midtransPayload = {
    transaction_details: {
      order_id: digiflazzPayload.order_id,
      gross_amount: price || 10000,
    },
    customer_details: {
      email,
    },
  };
  let snapToken = "";
  try {
    const midtransRes = await axios.post(midtransUrl, midtransPayload, {
      headers: {
        Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    });
    snapToken = midtransRes.data.token;
  } catch (err: any) {
    return Response.json({ success: false, message: "Gagal membuat transaksi Midtrans", error: err.message });
  }

  // 3. Simpan order ke MongoDB
  try {
    const db = await getDb();
    await db.collection("orders").insertOne({
      orderId: digiflazzPayload.order_id,
      code,
      userId,
      email,
      nominal,
      price,
      snapToken,
      status: "pending",
      createdAt: new Date(),
    });
  } catch (e: any) {
    console.error("[order] failed to insert order:", e.message);
  }

  return Response.json({
    success: true,
    message: "Order berhasil dibuat, lanjutkan pembayaran.",
    snapToken,
    data: { code, userId, email, nominal, price },
  });
}
