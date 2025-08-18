import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();
    const s = await db.collection("settings").findOne({ _id: "main" as any });
    const enabled = Boolean(
      s?.gamification_enabled === true ||
      s?.gamification_enabled === "on" ||
      s?.gamification_enabled === "true"
    );
    return Response.json({ gamification_enabled: enabled });
  } catch (e) {
    return Response.json({ gamification_enabled: null }, { status: 503 });
  }
}
