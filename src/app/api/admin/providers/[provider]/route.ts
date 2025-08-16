import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const name = (provider || "").toLowerCase();
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({ key: `provider:${name}` });
    const value = doc?.value || {};
    return Response.json({ success: true, data: { enabled: Boolean(value.enabled), updatedAt: value.updatedAt || null } });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const name = (provider || "").toLowerCase();
  let body: any = {};
  try { body = await req.json(); } catch {}
  const enabled = Boolean(body?.enabled);
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: `provider:${name}` },
      { $set: { key: `provider:${name}`, value: { enabled, updatedAt: new Date() } } },
      { upsert: true }
    );
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
