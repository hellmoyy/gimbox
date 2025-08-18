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
  const override = (process.env.VCGAMERS_BASE_URL || "").trim();
  if (override) return override.replace(/\/$/, "");
  const sandbox = typeof CFG_SANDBOX === "boolean" ? CFG_SANDBOX : process.env.VCGAMERS_SANDBOX === "true";
  // Defaults (can be overridden with VCGAMERS_BASE_URL)
  return sandbox ? "https://sandbox-api.vcgamers.com" : "https://api.vcgamers.com";
}

function pathPriceList() {
  return (process.env.VCGAMERS_PRICELIST_PATH || "/v1/pricelist").trim();
}

function pathBalance() {
  return (process.env.VCGAMERS_BALANCE_PATH || "/v1/balance").trim();
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
    const candidates = Array.from(new Set([
      pathPriceList(),
      "/v2/pricelist",
      "/v2/products/pricelist",
      "/v2/product/pricelist",
      "/v1/pricelist",
    ]));
    const tried: string[] = [];
    for (const p of candidates) {
      const url = baseUrl() + p;
      tried.push(p);
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }).catch((e: any) => {
        console.warn("[vcgamers] pricelist fetch error", p, e?.message || e);
        return undefined as any;
      });
      if (!res) continue;
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn("[vcgamers] pricelist HTTP", res.status, p, txt?.slice(0,120) || "");
        continue;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      if (Array.isArray(items) && items.length >= 0) {
        return items.map((it: any) => ({
          code: String(it.code || it.sku || it.product_code || ""),
          name: String(it.name || it.product_name || it.title || ""),
          cost: Number(it.price || it.cost || 0),
          icon: it.icon || it.image,
          category: it.category,
        }));
      }
    }
    console.warn("[vcgamers] pricelist: all candidate paths failed", tried);
    return [];
  } catch (e) {
  const err: any = e;
  const code = err?.code || err?.cause?.code || "";
  console.warn("[vcgamers] getPriceList error:", err?.message || err, code);
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
    const candidates = Array.from(new Set([
      pathBalance(),
      "/v2/balance",
      "/v2/wallet/balance",
      "/v1/balance",
    ]));
    const errors: string[] = [];
    for (const p of candidates) {
      const url = baseUrl() + p;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }).catch((e: any) => {
        errors.push(`${p}: ${e?.message || e}`);
        return undefined as any;
      });
      if (!res) continue;
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        errors.push(`${p}: HTTP ${res.status} ${(text||'').slice(0,120)}`);
        continue;
      }
      const data = JSON.parse(text || "{}") as any;
      const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
      return { success: true, balance: bal };
    }
    return { success: false, message: `All paths failed: ${errors.join(" | ")}` };
  } catch (e: any) {
  const code = e?.code || e?.cause?.code || "";
  const msg = [e?.message || "Request error", code].filter(Boolean).join(" ");
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
