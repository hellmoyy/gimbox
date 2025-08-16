import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const defaults = [
    { code: "game", name: "Game", isActive: true, sort: 1 },
    { code: "voucher", name: "Voucher", isActive: true, sort: 2 },
  ];
  for (const c of defaults) {
    await db.collection("categories").updateOne(
      { code: c.code },
      { $set: c },
      { upsert: true }
    );
  }
  return Response.redirect(new URL("/admin/categories", req.url));
}
