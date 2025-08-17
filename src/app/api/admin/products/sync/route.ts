import { NextRequest } from "next/server";
import { getDb } from "../../../../../lib/mongodb";
import { fetchDigiflazzPriceList, fetchIAKPriceList, upsertProductsFromList } from "../../../../../lib/providerSync";
import { getPriceList as fetchVCGPriceList } from "../../../../../lib/providers/vcgamers";


export async function POST(req: NextRequest) {
  const form = await req.formData();
  const provider = String(form.get("provider"));
  let db;
  try {
    db = await getDb();
  } catch (e) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
  const s: any = await db.collection("settings").findOne({ _id: "main" as any });

  let list: Array<{ code: string; name: string; cost: number }> = [];
  if (provider === "digiflazz") {
    list = await fetchDigiflazzPriceList(s?.digiflazz_username || process.env.DIGIFLAZZ_USERNAME || "", s?.digiflazz_api_key || process.env.DIGIFLAZZ_API_KEY || "");
  } else if (provider === "iak") {
    list = await fetchIAKPriceList(s?.iak_username || process.env.IAK_USERNAME || "", s?.iak_api_key || process.env.IAK_API_KEY || "", s?.iak_secret || process.env.IAK_SECRET || "");
  } else if (provider === "vcgamers") {
    list = await fetchVCGPriceList();
  }

  try {
    await upsertProductsFromList(list as any);
  } catch (e) {
    return Response.json({ error: "Failed to upsert products" }, { status: 500 });
  }

  return Response.redirect(new URL("/admin/products", req.url));
}
