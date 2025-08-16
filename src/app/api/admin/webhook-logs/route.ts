import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
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
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const size = Math.min(100, Math.max(1, Number(searchParams.get("size") || 20)));
    const src = String(searchParams.get("src") || "").trim();
    const matchedParam = searchParams.get("matched");
    const matched = matchedParam === null ? undefined : matchedParam === "true" ? true : matchedParam === "false" ? false : undefined;
    const q = String(searchParams.get("q") || "").trim();
    const orderId = String(searchParams.get("orderId") || "").trim();

    const query: any = {};
    if (src) query.src = src;
    if (typeof matched === "boolean") query.matched = matched;
    if (orderId) query.orderId = orderId;
    if (q && !orderId) {
      query.$or = [
        { orderId: { $regex: q, $options: "i" } },
        { reason: { $regex: q, $options: "i" } },
        { "body.description": { $regex: q, $options: "i" } },
        { "body.note": { $regex: q, $options: "i" } },
      ];
    }

    const db = await getDb();
    const coll = db.collection("webhook_logs");
    const total = await coll.countDocuments(query);
    const items = await coll
      .find(query)
      .project({ headers: 0 })
      .sort({ ts: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .toArray();

    return Response.json({ success: true, data: { items, page, size, total, hasMore: page * size < total } });
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : e?.message || "DB error";
    return Response.json({ success: false, error: msg }, { status: 503 });
  }
}
