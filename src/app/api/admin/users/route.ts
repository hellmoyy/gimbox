import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

export async function GET(req: NextRequest) {
  // Simple admin auth via cookie (same as middleware)
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sp = url.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20", 10)));
  const q = (sp.get("q") || "").trim();

  const db = await getDb();
  const col = db.collection("wallets");
  const filter: any = {};
  if (q) {
    filter.$or = [
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ];
  }

  const total = await col.countDocuments(filter);
  const items = await col
    .find(filter)
    .project({ _id: 0 })
    .sort({ updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return Response.json({
    success: true,
    data: items.map((it: any) => ({
      email: it.email,
      name: it.name || "",
      balance: typeof it.balance === "number" ? it.balance : 0,
      updatedAt: it.updatedAt || it.createdAt || null,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
