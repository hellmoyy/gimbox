import { getPriceList } from "../../../../../../lib/providers/vcgamers";

export async function GET() {
  const data = await getPriceList();
  return Response.json({ success: true, data });
}
