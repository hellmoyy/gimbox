import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { importProviderNewOnly } from "../../../../../lib/providerSync";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const provider = String(form.get("provider") || "");
  if (!provider) return Response.json({ error: "Missing provider" }, { status: 400 });

  let db;
  try {
    db = await getDb();
  } catch (e) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
  const s: any = await db.collection("settings").findOne({ _id: "main" as any });

  try {
    const result = await importProviderNewOnly(provider as any, s);
    const url = new URL("/admin/products", req.url);
    url.searchParams.set("imported", String(result?.count || 0));
    url.searchParams.set("provider", provider);
    return Response.redirect(url);
  } catch (e: any) {
    const url = new URL("/admin/products/import-new", req.url);
    url.searchParams.set("error", e?.message ? String(e.message) : "Failed to import products");
    return Response.redirect(url);
  }
}
