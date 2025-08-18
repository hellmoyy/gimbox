/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { VCGAMERS_API_KEY as CFG_KEY, VCGAMERS_SECRET_KEY as CFG_SECRET, VCGAMERS_SANDBOX as CFG_SANDBOX } from "../runtimeConfig";

export type VCGOrderRequest = {
  productCode: string;
  customerId: string;
  serverId?: string;
  refId: string;
  notes?: string;
};

export type VCGOrderResponse = {
  success: boolean;
  message?: string;
  data?: any;
  orderId?: string;
  status?: string;
};

function baseUrl() {
  const sandbox = typeof CFG_SANDBOX === "boolean" ? CFG_SANDBOX : process.env.VCGAMERS_SANDBOX === "true";
  // TODO: Verify base URLs from official docs
  return sandbox
    ? "https://sandbox-api.vcgamers.com"
    : "https://api.vcgamers.com";
}

function getKeys() {
  const apiKey = (typeof CFG_KEY === "string" && CFG_KEY.length ? CFG_KEY : undefined) || process.env.VCGAMERS_API_KEY || "";
  const secret = (typeof CFG_SECRET === "string" && CFG_SECRET.length ? CFG_SECRET : undefined) || process.env.VCGAMERS_SECRET_KEY || "";
  if (!apiKey || !secret) throw new Error("VCGAMERS api key/secret missing in env");
  return { apiKey, secret };
}

export function signPayload(payload: any) {
  const { secret } = getKeys();
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  // Assumption: HMAC-SHA256 over body using secret
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function getPriceList(): Promise<Array<{ code: string; name: string; cost: number; icon?: string; category?: string }>> {
  try {
    const { apiKey } = getKeys();
    const url = baseUrl() + "/v1/pricelist"; // TODO: confirm path
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // Next.js fetch cache control: always revalidate on request from admin sync
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // TODO: map fields according to docs
    const items = Array.isArray(data?.data) ? data.data : [];
    return items.map((it: any) => ({
      code: String(it.code || it.sku || it.product_code || ""),
      name: String(it.name || it.product_name || it.title || ""),
      cost: Number(it.price || it.cost || 0),
      icon: it.icon || it.image,
      category: it.category,
    }));
  } catch (e) {
    console.warn("[vcgamers] getPriceList error:", (e as any)?.message || e);
    // Fallback: return empty so sync can continue
    return [];
  }
}

export async function createOrder(req: VCGOrderRequest): Promise<VCGOrderResponse> {
  const { apiKey } = getKeys();
  const url = baseUrl() + "/v1/orders"; // TODO: confirm path
  const body: any = {
    product_code: req.productCode,
    customer_id: req.customerId,
    server_id: req.serverId,
    ref_id: req.refId,
    notes: req.notes,
  };
  const signature = signPayload(body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Signature": signature,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.message || `HTTP ${res.status}` };
    return { success: true, data, orderId: data?.data?.order_id || data?.order_id, status: data?.data?.status || data?.status };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getOrderStatus(orderId: string): Promise<VCGOrderResponse> {
  const { apiKey } = getKeys();
  const url = baseUrl() + `/v1/orders/${encodeURIComponent(orderId)}`; // TODO: confirm path
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.message || `HTTP ${res.status}` };
    return { success: true, data, orderId, status: data?.data?.status || data?.status };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export async function getBalance(): Promise<{ success: boolean; balance?: number; message?: string }> {
  try {
    const { apiKey } = getKeys();
    const url = baseUrl() + "/v1/balance"; // TODO: confirm path
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: data?.message || `HTTP ${res.status}` };
    const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
    return { success: true, balance: bal };
  } catch (e: any) {
    const msg = e?.message || "Request error";
    console.warn("[vcgamers] getBalance error:", msg);
    // Common: missing keys
    if (/missing/i.test(msg) || /key/i.test(msg)) {
      return { success: false, message: "VCGamers API key/secret belum dikonfigurasi" };
    }
    return { success: false, message: msg };
  }
}

export function verifyWebhookSignature(rawBody: string, signatureHeader?: string) {
  if (!signatureHeader) return false;
  const expected = signPayload(rawBody);
  // Flexible compare: constant-time comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
