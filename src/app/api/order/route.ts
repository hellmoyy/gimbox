import { NextRequest } from "next/server";
import axios from "axios";
import { getDb } from "../../../lib/mongodb";
import { getXenditConfig, createQris as xenditCreateQris, createVaBca as xenditCreateVaBca } from "@/lib/providers/xendit";
import { listBankAccounts as mootaListBankAccounts } from "@/lib/providers/moota";

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
  const productCode: string | undefined = body?.productCode;
  const productLabel: string | undefined = body?.productLabel;
  const variantLabel: string | null | undefined = body?.variantLabel;
  const variantPrice: number | null | undefined = body?.variantPrice;
  const gateway: string = (body?.gateway || "midtrans").toLowerCase();
  const method: string = String(body?.method || "");
  // Optional extra fields for richer transaction tracking
  const provider: string = body?.provider || "digiflazz"; // default current flow
  const buyPrice: number | null = typeof body?.buyPrice === "number" ? body.buyPrice : null;
  const adminFee: number = typeof body?.adminFee === "number" ? body.adminFee : 0;
  // Determine base price from variant (preferred) or fallback to provided price
  const basePrice: number = typeof variantPrice === 'number' ? Number(variantPrice) : Number(price || 0);
  // Derive gateway fee on server based on Active Payments config using base price
  let gatewayFee = 0;
  try {
    const db = await getDb();
    const ap = await db.collection("settings").findOne({ key: "gateway:active_payments" });
    const items = Array.isArray(ap?.value?.items) ? ap!.value.items : [];
    const pick = items.find((it: any) => String(it.gateway).toLowerCase() === gateway && String(it.method).toLowerCase() === method.toLowerCase() && it.enabled !== false);
    if (pick) {
      const feeType = pick.feeType === 'percent' ? 'percent' : 'flat';
      const feeValue = typeof pick.feeValue === 'number' ? pick.feeValue : Number(pick.feeValue || 0) || 0;
      const base = Number(basePrice || 0);
      gatewayFee = feeType === 'percent' ? Math.round((base * feeValue) / 100) : Math.round(feeValue);
    }
  } catch {}
  const otherFee: number = typeof body?.otherFee === "number" ? body.otherFee : 0;
  const totalSellPrice = Math.max(0, Number(basePrice) + Number(gatewayFee));

  // Wallet (GimCash) immediate payment branch
  if (gateway === 'wallet' || gateway === 'gimcash') {
    try {
      const db = await getDb();
      // Basic validation
      if (!email) return Response.json({ success: false, message: 'Email diperlukan untuk pembayaran GimCash' }, { status: 400 });
      if (!userId) return Response.json({ success: false, message: 'User ID diperlukan' }, { status: 400 });
      // Fetch wallet
      const wallet = await db.collection('wallets').findOne({ email });
      const balance: number = typeof wallet?.balance === 'number' ? wallet.balance : 0;
      if (balance < totalSellPrice) {
        return Response.json({ success: false, message: 'Saldo GimCash tidak cukup' }, { status: 400 });
      }
      const orderId = Date.now().toString();
      // Atomic deduction & order creation inside a transaction-like flow
      const sessionDb = db; // (no multi-doc transaction needed if same db; we do ordered operations)
      const newBalance = balance - totalSellPrice;
      // Optimistic update using balance match to prevent race deduction
      const upd = await sessionDb.collection('wallets').updateOne({ email, balance }, { $set: { balance: newBalance, updatedAt: new Date() } });
      let finalBalance = newBalance;
      if (upd.modifiedCount !== 1) {
        // Race condition: retry once
        const fresh = await sessionDb.collection('wallets').findOne({ email });
        const freshBal = typeof fresh?.balance === 'number' ? fresh.balance : 0;
        if (freshBal < totalSellPrice) {
          return Response.json({ success: false, message: 'Saldo GimCash tidak cukup' }, { status: 400 });
        }
        const upd2 = await sessionDb.collection('wallets').updateOne({ email, balance: freshBal }, { $set: { balance: freshBal - totalSellPrice, updatedAt: new Date() } });
        if (upd2.modifiedCount !== 1) {
          return Response.json({ success: false, message: 'Gagal memperbarui saldo. Coba lagi.' }, { status: 500 });
        }
        finalBalance = freshBal - totalSellPrice;
      }
      await sessionDb.collection('orders').insertOne({
        orderId,
        provider,
        paymentGateway: 'wallet',
        method: method || 'gimcash',
        code,
        productCode: productCode || code,
        productLabel: productLabel || code,
        variantLabel: variantLabel || null,
        variantPrice: typeof variantPrice === 'number' ? variantPrice : price,
        userId,
        email,
        nominal,
        sellPrice: totalSellPrice,
        buyPrice,
        fees: { admin: adminFee, gateway: 0, other: otherFee, total: Number(adminFee + otherFee) },
        details: { wallet: { deducted: totalSellPrice } },
        status: 'paid', // instantly paid
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Log wallet transaction (debit)
      try {
        const now = new Date();
        await sessionDb.collection('wallet_transactions').insertOne({
          orderId,
          email,
          amount: -Math.abs(totalSellPrice), // store debit as negative
          type: 'purchase',
          note: productLabel || productCode || code || 'purchase',
          balanceAfter: finalBalance,
          createdAt: now,
          date: now,
        });
      } catch (e:any) {
        // Ensure index exists (best-effort)
        try { await sessionDb.collection('wallet_transactions').createIndex({ email: 1, createdAt: -1 }); } catch {}
      }
      return Response.json({ success: true, message: 'Pembayaran berhasil dengan GimCash', orderId });
    } catch (e: any) {
      return Response.json({ success: false, message: 'Gagal memproses pembayaran GimCash', error: e?.message || 'wallet' }, { status: 500 });
    }
  }

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

  // 2. Buat transaksi ke gateway terpilih
  // Branch A: Custom/Moota (manual instructions)
  if (gateway === "moota") {
    const db = await getDb();
    const orderId = digiflazzPayload.order_id;
    try {
      // Try fetching bank account info from Moota (prefer BCA)
      let details: any = {};
      try {
        const resp: any = await mootaListBankAccounts();
        const list: any[] = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        const pick = list.find((b: any) => String(b?.bank || b?.bank_type || "").toUpperCase().includes("BCA")) || list[0];
        if (pick) {
          details = {
            bankName: String(pick.bank || pick.bank_type || "BCA").toUpperCase(),
            accountNumber: String(pick.number || pick.account_number || pick.accountNumber || ""),
            accountHolder: String(pick.name || pick.account_name || pick.accountName || ""),
            moota: { id: pick.id || pick._id || null },
          };
        }
      } catch {}

      await db.collection("orders").insertOne({
        orderId,
        provider,
        paymentGateway: gateway,
        method,
        code,
  productCode: productCode || code,
  productLabel: productLabel || code,
  variantLabel: variantLabel || null,
  variantPrice: typeof variantPrice === 'number' ? variantPrice : price,
        userId,
        email,
        nominal,
        sellPrice: totalSellPrice,
        buyPrice,
        fees: { admin: adminFee, gateway: gatewayFee, other: otherFee, total: Number(adminFee + gatewayFee + otherFee) },
        details,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e: any) {
      return Response.json({ success: false, message: "Gagal menyimpan order", error: e?.message || "db" }, { status: 500 });
    }
    return Response.json({ success: true, message: "Order dibuat. Lanjutkan pembayaran.", orderId });
  }

  // Branch B: Xendit (placeholder storage; integrate invoice/charges later)
  if (gateway === "xendit") {
    const db = await getDb();
    const orderId = digiflazzPayload.order_id;
    try {
      // Create charge based on method hint
      let details: any = {};
      try {
        const cfg = await getXenditConfig();
        if (!cfg.enabled) throw new Error("Xendit disabled");
        if (String(method).toLowerCase().includes("qris")) {
          const q = await xenditCreateQris({ referenceId: orderId, amount: totalSellPrice || 0 });
          details = { qrCodeUrl: q?.qr_string ? `https://api.qrserver.com/v1/create-qr-code/?size=184x184&data=${encodeURIComponent(q.qr_string)}` : undefined, xendit: { qrisId: q?.id, qrString: q?.qr_string } };
        } else {
          // Default to VA BCA
          const v = await xenditCreateVaBca({ externalId: orderId, name: email || "Customer", expectedAmount: totalSellPrice || undefined });
          details = { bankName: "BCA", accountNumber: v?.account_number, accountHolder: email || "Customer", xendit: { vaId: v?.id } };
        }
      } catch {
        // Keep details empty if Xendit call fails; UI will fallback to dummy/instructions
      }
      await db.collection("orders").insertOne({
        orderId,
        provider,
        paymentGateway: gateway,
        method,
        code,
        productCode: productCode || code,
        productLabel: productLabel || code,
        variantLabel: variantLabel || null,
        variantPrice: typeof variantPrice === 'number' ? variantPrice : price,
        userId,
        email,
        nominal,
        sellPrice: totalSellPrice,
        buyPrice,
        fees: { admin: adminFee, gateway: gatewayFee, other: otherFee, total: Number(adminFee + gatewayFee + otherFee) },
        details,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e: any) {
      return Response.json({ success: false, message: "Gagal menyimpan order Xendit", error: e?.message || "db" }, { status: 500 });
    }
    return Response.json({ success: true, message: "Order dibuat. Lanjutkan pembayaran.", orderId });
  }

  // Branch C: Duitku
  if (gateway === 'duitku') {
    const db = await getDb();
    const orderId = digiflazzPayload.order_id; // reuse generated id
    try {
      // Basic validation
      if (!email) return Response.json({ success: false, message: 'Email diperlukan untuk Duitku' }, { status: 400 });
      // Build create-transaction payload (delegate to internal API)
      const origin = (req as any).nextUrl?.origin || process.env.APP_BASE_URL || '';
      const callbackUrl = origin ? origin + '/api/payment/duitku/callback' : undefined;
      const returnUrl = origin ? origin + '/payment-instructions/' + orderId : undefined;
      const paymentAmount = totalSellPrice; // include gatewayFee already in totalSellPrice
      const paymentMethod = method.toUpperCase();
      let paymentUrl: string | undefined;
      try {
        const resp = await fetch(origin + '/api/payment/duitku/create-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentAmount,
            paymentMethod,
            merchantOrderId: orderId,
            productDetails: productLabel || productCode || code,
            email,
            customerVaName: (email || 'Customer').split('@')[0].slice(0,50),
            callbackUrl,
            returnUrl,
            itemDetails: [
              { name: productLabel || productCode || code, price: paymentAmount, quantity: 1 }
            ],
            customerDetail: {
              email,
              firstName: (email || 'User').split('@')[0]
            }
          })
        });
        const j = await resp.json();
        if (j?.statusCode === '00' || j?.paymentUrl) {
          paymentUrl = j.paymentUrl;
        }
      } catch {}

      await db.collection('orders').insertOne({
        orderId,
        provider,
        paymentGateway: gateway,
        method,
        code,
        productCode: productCode || code,
        productLabel: productLabel || code,
        variantLabel: variantLabel || null,
        variantPrice: typeof variantPrice === 'number' ? variantPrice : price,
        userId,
        email,
        nominal,
        sellPrice: totalSellPrice,
        buyPrice,
        fees: { admin: adminFee, gateway: gatewayFee, other: otherFee, total: Number(adminFee + gatewayFee + otherFee) },
        details: { duitku: { paymentUrl, paymentMethod } },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return Response.json({ success: true, message: 'Order dibuat. Lanjutkan pembayaran.', orderId, paymentUrl });
    } catch (e:any) {
      return Response.json({ success: false, message: 'Gagal membuat order Duitku', error: e?.message || 'duitku' }, { status: 500 });
    }
  }

  // Branch C: Midtrans
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
      gross_amount: totalSellPrice || 10000,
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
      method,
      code,
  productCode: productCode || code,
  productLabel: productLabel || code,
  variantLabel: variantLabel || null,
  variantPrice: typeof variantPrice === 'number' ? variantPrice : price,
      userId,
      email,
      nominal,
      sellPrice: totalSellPrice,
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
    orderId: digiflazzPayload.order_id,
    snapToken,
    snapRedirectUrl,
    midtransClientKey: clientKey || undefined,
    data: { code, userId, email, nominal, price },
  });
}
