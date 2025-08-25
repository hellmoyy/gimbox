import { NextRequest } from "next/server";
import { ensureAdminRequest } from "@/lib/adminAuth";
import { getVariations } from "@/lib/providers/vcgamers";

export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ success:false, message:'Unauthorized' }, { status:401 });
  const url = new URL(req.url);
  const brand = url.searchParams.get('brand');
  if (!brand) return Response.json({ success:false, message:'Missing brand' }, { status:400 });
  const items = await getVariations(brand);
  return Response.json({ success:true, data: items });
}
