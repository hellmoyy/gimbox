import axios from "axios";
import { getDb } from "../mongodb";
import { XENDIT_SECRET_KEY as CFG_X_SECRET, XENDIT_IS_PRODUCTION as CFG_X_PROD } from "../runtimeConfig";

export async function getXenditConfig() {
  const db = await getDb();
  const doc = await db.collection("settings").findOne({ key: "gateway:xendit" });
  const value = doc?.value || {};
  const secretKey: string = String(value?.keys?.secretKey || CFG_X_SECRET || process.env.XENDIT_SECRET_KEY || "");
  const isProduction: boolean = Boolean(value?.isProduction ?? CFG_X_PROD ?? false);
  const methods: string[] = Array.isArray(value?.methods) ? value.methods : [];
  const enabled: boolean = Boolean(value?.enabled);
  return { secretKey, isProduction, methods, enabled };
}

export async function createQris(params: { referenceId: string; amount: number; currency?: string; expiresAt?: string }) {
  const { secretKey } = await getXenditConfig();
  if (!secretKey) throw new Error("Xendit secret key is not configured");
  const base = "https://api.xendit.co";
  const payload: any = {
    reference_id: params.referenceId,
    type: "DYNAMIC",
    currency: params.currency || "IDR",
    amount: Math.round(params.amount || 0),
    // expires_at: params.expiresAt, // optional ISO
  };
  const res = await axios.post(`${base}/qr_codes`, payload, {
    auth: { username: secretKey, password: "" },
    headers: { "Content-Type": "application/json" },
  });
  // Common fields: id, reference_id, type, currency, amount, status, qr_string, expires_at
  return res.data;
}

export async function createVaBca(params: { externalId: string; name: string; expectedAmount?: number }) {
  const { secretKey } = await getXenditConfig();
  if (!secretKey) throw new Error("Xendit secret key is not configured");
  const base = "https://api.xendit.co";
  const payload: any = {
    external_id: params.externalId,
    bank_code: "BCA",
    name: params.name || "Customer",
  };
  if (typeof params.expectedAmount === "number" && params.expectedAmount > 0) payload.expected_amount = Math.round(params.expectedAmount);
  const res = await axios.post(`${base}/callback_virtual_accounts`, payload, {
    auth: { username: secretKey, password: "" },
    headers: { "Content-Type": "application/json" },
  });
  // Fields: id, external_id, bank_code, account_number, status, is_closed, expected_amount
  return res.data;
}
