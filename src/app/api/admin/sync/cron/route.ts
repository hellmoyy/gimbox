import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { syncProvider, ProviderName } from "../../../../../lib/providerSync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-cron-token") || "";
  let db;
  try {
    db = await getDb();
  } catch {
    return Response.json({ success: false, message: "DB unavailable" }, { status: 503 });
  }
  const s: any = await db.collection("settings").findOne({ _id: "main" as any });
  const expected = String(s?.sync_token || process.env.CRON_SYNC_TOKEN || "");
  if (!expected || token !== expected) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const providersRaw = String(s?.sync_providers || "vcgamers");
  const providers = providersRaw.split(/[\,\s]+/).map(v => v.trim()).filter(Boolean) as ProviderName[];
  const results: any[] = [];
  for (const p of providers) {
    try {
      const r = await syncProvider(p, s);
      results.push(r);
    } catch (e: any) {
      results.push({ provider: p, error: e?.message || String(e) });
    }
  }
  const at = new Date();
  await db.collection("settings").updateOne({ _id: "main" as any }, { $set: { sync_lastRunAt: at, sync_lastResult: results } }, { upsert: true });
  return Response.json({ success: true, ran: results, at });
}
