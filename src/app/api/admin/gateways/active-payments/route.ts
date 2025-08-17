import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({ key: "gateway:active_payments" });
    const items = Array.isArray(doc?.value?.items) ? doc!.value.items : [];
    return Response.json({ success: true, data: { items } });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const items = Array.isArray(body?.items) ? body.items : [];
  // sanitize items shape
  const clean = items.map((it: any, idx: number) => ({
    id: String(it.id || `${Date.now()}-${idx}`),
    label: typeof it.label === "string" ? it.label : "",
    gateway: String(it.gateway || ""),
    method: String(it.method || ""),
    logoUrl: typeof it.logoUrl === "string" ? it.logoUrl : "",
    enabled: Boolean(it.enabled),
    sort: typeof it.sort === "number" ? it.sort : idx,
    feeType: it.feeType === 'percent' ? 'percent' : 'flat',
    feeValue: typeof it.feeValue === 'number' ? it.feeValue : Number(it.feeValue || 0) || 0,
  }));
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: "gateway:active_payments" },
      { $set: { key: "gateway:active_payments", value: { items: clean, updatedAt: new Date() } } },
      { upsert: true }
    );
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
