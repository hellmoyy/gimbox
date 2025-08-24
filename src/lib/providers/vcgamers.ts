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
  // Prefer Mitra API by default if no override
  return sandbox ? "https://sandbox-api.vcgamers.com" : "https://mitra-api.vcgamers.com";
}

function candidateBaseUrls(): string[] {
  const set = new Set<string>();
  const primary = baseUrl();
  if (primary) set.add(primary);
  // Try common bases as fallbacks
  set.add("https://mitra-api.vcgamers.com");
  set.add("https://api.vcgamers.com");
  set.add("https://sandbox-api.vcgamers.com");
  return Array.from(set);
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

function getApiKey() {
  const apiKey = (typeof CFG_KEY === "string" && CFG_KEY.length ? CFG_KEY : undefined) || process.env.VCGAMERS_API_KEY || "";
  if (!apiKey) throw new Error("VCGAMERS api key missing in env");
  return apiKey;
}

function getSecret() {
  const secret = (typeof CFG_SECRET === "string" && CFG_SECRET.length ? CFG_SECRET : undefined) || process.env.VCGAMERS_SECRET_KEY || "";
  if (!secret) throw new Error("VCGAMERS secret key missing in env");
  return secret;
}

export function signPayload(payload: any) {
  const { secret } = getKeys();
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  // Assumption: HMAC-SHA256 over body using secret
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function getPriceList(): Promise<Array<{ code: string; name: string; cost: number; icon?: string; category?: string }>> {
  try {
    const apiKey = getApiKey();
    const paths = Array.from(new Set([
      pathPriceList(),
      "/v1/public/pricelist",
      "/v2/pricelist",
      "/v2/products/pricelist",
      "/v2/product/pricelist",
      "/v1/pricelist",
    ]));
    const bases = candidateBaseUrls();
    const headerVariants = [
      { name: "Bearer", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } },
      { name: "X-Api-Key", headers: { "Content-Type": "application/json", "X-Api-Key": apiKey } },
    ];
    const tried: string[] = [];
    for (const b of bases) {
      for (const p of paths) {
        for (const hv of headerVariants) {
          const url = b + p;
          tried.push(`${b}${p}#${hv.name}`);
          const res = await fetch(url, {
            method: "GET",
            headers: hv.headers as any,
            cache: "no-store",
          }).catch((e: any) => {
            console.warn("[vcgamers] pricelist fetch error", url, hv.name, e?.message || e);
            return undefined as any;
          });
          if (!res) continue;
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.warn("[vcgamers] pricelist HTTP", res.status, url, hv.name, txt?.slice(0,120) || "");
            continue;
          }
          const data = await res.json().catch(() => ({}));
          const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
          if (Array.isArray(items)) {
            return items.map((it: any) => ({
              code: String(it.code || it.sku || it.product_code || ""),
              name: String(it.name || it.product_name || it.title || ""),
              cost: Number(it.price || it.cost || 0),
              icon: it.icon || it.image,
              category: it.category,
            }));
          }
        }
      }
    }
    console.warn("[vcgamers] pricelist: all candidate bases/paths/headers failed", tried.slice(0, 10), tried.length);
    return [];
  } catch (e) {
  const err: any = e;
  const code = err?.code || err?.cause?.code || "";
  console.warn("[vcgamers] getPriceList error:", err?.message || err, code);
    // Fallback: return empty so sync can continue
    return [];
  }
}

// Discovered brand listing signature: sign = Base64( hex( HMAC_SHA512(secret + 'brand', secret) ) )
export async function getBrands(): Promise<Array<{ key: string; name: string; image?: string }>> {
  try {
    const apiKey = getApiKey();
    const secret = getSecret();
    const base = baseUrl();
    const baseString = secret + 'brand';
    const hmacHex = crypto.createHmac('sha512', secret).update(baseString).digest('hex');
    const signature = Buffer.from(hmacHex).toString('base64');
    const url = `${base}/v2/public/brands?sign=${encodeURIComponent(signature)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' }).catch((e:any)=>{
      console.warn('[vcgamers] getBrands fetch error', e?.message||e); return undefined as any; });
    if (!res) return [];
    const text = await res.text();
    if (!res.ok) {
      console.warn('[vcgamers] getBrands HTTP', res.status, text.slice(0,120));
      return [];
    }
    let json: any = {};
    try { json = JSON.parse(text||'{}'); } catch {}
    const items = Array.isArray(json?.data)? json.data : (Array.isArray(json)? json : []);
    return items.filter(Boolean).map((it:any)=>({ key: String(it.key||''), name: String(it.name||''), image: it.image_url || it.logo || it.icon }));
  } catch (e:any) {
    console.warn('[vcgamers] getBrands error', e?.message||e);
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
    const apiKey = getApiKey();
    const bases = candidateBaseUrls();
    const errors: string[] = [];

    // 1) Try signed GET to /v1/public/balance (Mitra API usually expects this)
    try {
      const secret = getSecret();
      const ts = Math.floor(Date.now() / 1000).toString();
      for (const b of bases) {
        const url = b + "/v1/public/balance";
        // Common variants: signature over timestamp (with X-Timestamp) or empty string (no timestamp)
        const variants: Array<{ name: string; headers: Record<string, string> }> = [
          { name: "GET-X-Api-Key+X-Signature+X-Timestamp(ts)", headers: { Accept: "application/json", "X-Api-Key": apiKey, "X-Timestamp": ts, "X-Signature": crypto.createHmac("sha256", secret).update(ts).digest("hex") } },
          { name: "GET-Bearer+X-Signature+X-Timestamp(ts)", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "X-Timestamp": ts, "X-Signature": crypto.createHmac("sha256", secret).update(ts).digest("hex") } },
          { name: "GET-X-Api-Key+X-Signature(empty)", headers: { Accept: "application/json", "X-Api-Key": apiKey, "X-Signature": crypto.createHmac("sha256", secret).update("").digest("hex") } },
          { name: "GET-Bearer+X-Signature(empty)", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "X-Signature": crypto.createHmac("sha256", secret).update("").digest("hex") } },
        ];
        for (const v of variants) {
          const res = await fetch(url, { method: "GET", headers: v.headers as any, cache: "no-store" }).catch((e: any) => {
            errors.push(`${url}#${v.name}: ${e?.message || e}`);
            return undefined as any;
          });
          if (!res) continue;
          const text = await res.text().catch(() => "");
          if (!res.ok) {
            errors.push(`${url}#${v.name}: HTTP ${res.status} ${(text||'').slice(0,120)}`);
            continue;
          }
          const data = JSON.parse(text || "{}") as any;
          const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
          if (!Number.isNaN(bal)) return { success: true, balance: bal };
        }
      }
    } catch (e: any) {
      // Missing secret is fine; we'll fallback to other GET attempts
      if (/missing/i.test(String(e?.message))) {
        errors.push("secret missing: skip signed GET public balance");
      } else {
        errors.push(`signed GET error: ${e?.message || e}`);
      }
    }

    // 2) Fallback: GET on various non-public paths and headers
    const paths = Array.from(new Set([
      pathBalance(),
      "/v2/balance",
      "/v2/wallet/balance",
      "/v1/balance",
    ]));
    const headerVariants = [
      { name: "Bearer", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } },
      { name: "X-Api-Key", headers: { "Content-Type": "application/json", "X-Api-Key": apiKey } },
    ];
    for (const b of bases) {
      for (const p of paths) {
        for (const hv of headerVariants) {
          const url = b + p;
          const res = await fetch(url, {
            method: "GET",
            headers: hv.headers as any,
            cache: "no-store",
          }).catch((e: any) => {
            errors.push(`${b}${p}#${hv.name}: ${e?.message || e}`);
            return undefined as any;
          });
          if (!res) continue;
          const text = await res.text().catch(() => "");
          if (!res.ok) {
            errors.push(`${b}${p}#${hv.name}: HTTP ${res.status} ${(text||'').slice(0,120)}`);
            continue;
          }
          const data = JSON.parse(text || "{}") as any;
          const bal = Number(data?.data?.balance ?? data?.balance ?? 0);
          return { success: true, balance: bal };
        }
      }
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
