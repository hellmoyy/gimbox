import { getBalance } from "../../../../../../lib/providers/vcgamers";

export async function GET() {
  try {
    const res = await getBalance();
    const status = res.success ? 200 : 400;
    return Response.json(res, { status });
  } catch (e: any) {
    return Response.json({ success: false, message: e?.message || "Unknown error" }, { status: 500 });
  }
}
