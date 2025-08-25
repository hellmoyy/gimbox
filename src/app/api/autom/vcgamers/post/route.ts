import { NextRequest } from "next/server";
import { ensureAdminRequest } from "@/lib/adminAuth";
import { sellerUpsertProduct } from "@/lib/providers/vcgamers";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(()=>({})) as any;
  const { productCode, name, brandKey, variationKey, cost, price, category, imageUrl, isActive, raw } = body || {};
  if (!productCode || !name || typeof cost !== 'number') return Response.json({ success:false, message:'Missing productCode/name/cost' }, { status:400 });
  const res = await sellerUpsertProduct({ productCode, name, brandKey, variationKey, cost, price, category, imageUrl, isActive, raw });
  // audit log
  try {
    const db = await getDb();
    await db.collection('vcg_autom_logs').insertOne({
      kind: 'sellerUpsert',
      productCode,
      name,
      brandKey,
      variationKey,
      cost,
      price,
      category,
      imageUrl,
      isActive: isActive !== false,
      success: res.success,
      remoteId: res.remoteId,
      message: res.message,
      createdAt: new Date()
    });
  } catch {}
  return Response.json(res, { status: res.success ? 200 : 502 });
}
