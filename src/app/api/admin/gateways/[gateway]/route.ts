import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";

export async function GET(_req: NextRequest, { params }: { params: { gateway: string } }) {
  const gw = (params.gateway || "").toLowerCase();
  try {
    const db = await getDb();
    const doc = await db.collection("settings").findOne({ key: `gateway:${gw}` });
    return Response.json({ success: true, data: doc?.value || null });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { gateway: string } }) {
  const gw = (params.gateway || "").toLowerCase();
  let body: any = {};
  try { body = await req.json(); } catch {}
  // expected body: { enabled: boolean, keys: object, methods: string[] }
  const value = {
    enabled: Boolean(body?.enabled),
    keys: body?.keys || {},
    methods: Array.isArray(body?.methods) ? body.methods : [],
    updatedAt: new Date(),
  };
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { key: `gateway:${gw}` },
      { $set: { key: `gateway:${gw}`, value } },
      { upsert: true }
    );
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ success: false, message: e.message }, { status: 500 });
  }
}
