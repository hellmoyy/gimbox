import { getBalance } from "../../../../../../lib/providers/vcgamers";

export async function GET() {
  const res = await getBalance();
  const status = res.success ? 200 : 502;
  return Response.json(res, { status });
}
