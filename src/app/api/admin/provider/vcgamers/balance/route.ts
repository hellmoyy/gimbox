import { NextResponse, NextRequest } from "next/server";
import { getBalance } from "../../../../../../lib/providers/vcgamers";
import { ensureAdminRequest } from "../../../../../../lib/adminAuth";

export async function GET(req: NextRequest) {
  const authed = ensureAdminRequest(req);
  if (!authed) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const res = await getBalance();
    if (!res.success) return NextResponse.json({ success: false, message: res.message }, { status: 400 });
    return NextResponse.json({ success: true, balance: res.balance }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || "Unknown error" }, { status: 500 });
  }
}
