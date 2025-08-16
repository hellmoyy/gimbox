import { getDb } from "../../../lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const items = await db
      .collection("games")
      .find({ isActive: { $ne: false } })
      .project({ name: 1, code: 1, icon: 1 })
      .sort({ name: 1 })
      .toArray();
    return Response.json({ data: items });
  } catch (e) {
    return new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503, headers: { "content-type": "application/json" } });
  }
}
