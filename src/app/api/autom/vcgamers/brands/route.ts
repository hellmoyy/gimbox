import { NextRequest } from "next/server";
// Path: src/app/api/autom/vcgamers/brands/route.ts -> go up to src/lib
// api/autom/vcgamers/brands (5 segments after app) so need ../../../../../lib
import { ensureAdminRequest } from "@/lib/adminAuth";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  if (!ensureAdminRequest(req)) return Response.json({ success:false, message:'Unauthorized' }, { status:401 });
  try {
    const db = await getDb();
    const brands = await db.collection('brands').find({ isActive: { $ne: false } })
      .project({ _id:0, code:1, name:1, icon:1 })
      .sort({ name:1 })
      .limit(1000)
      .toArray();
    return Response.json({ success:true, data: brands });
  } catch (e:any) {
    return Response.json({ success:false, message: e.message||'DB error' }, { status:500 });
  }
}
