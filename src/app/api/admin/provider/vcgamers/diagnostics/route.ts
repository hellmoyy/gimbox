import { NextRequest } from "next/server";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const base = (process.env.VCGAMERS_BASE_URL || '').trim() || (process.env.VCGAMERS_SANDBOX === 'true' ? 'https://sandbox-api.vcgamers.com' : 'https://api.vcgamers.com');
  const paths = [
    process.env.VCGAMERS_BALANCE_PATH || '/v1/balance',
    '/v2/balance',
    '/v2/wallet/balance',
    '/v1/balance',
  ];
  const results: any[] = [];
  for (const p of Array.from(new Set(paths))) {
    try {
      const res = await fetch(base.replace(/\/$/, '') + p, { cache: 'no-store' });
      const text = await res.text().catch(() => '');
      results.push({ path: p, ok: res.ok, status: res.status, body: (text||'').slice(0,180) });
    } catch (e: any) {
      results.push({ path: p, ok: false, error: e?.message || 'fetch failed', code: e?.code || e?.cause?.code });
    }
  }
  return Response.json({ success: true, base, results });
}
